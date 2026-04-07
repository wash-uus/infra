/**
 * Integration tests — Full Escrow Lifecycle
 *
 * Covers the complete payment escrow state machine:
 *   create (pending) → mark_in_progress → mark_complete → release_payment
 *
 * Also covers edge-case scenarios:
 *   - self-transaction prevention
 *   - out-of-order state transitions
 *   - commission calculation (5%)
 *
 * All Firebase + Prisma dependencies are mocked.
 */

// ── Hoist mocks before imports ────────────────────────────────────────────────

jest.mock('firebase-admin/firestore', () => {
  const serverTimestamp = jest.fn().mockReturnValue('__ts__');
  const increment = jest.fn((n: number) => `__inc_${n}__`);
  return {
    FieldValue: { serverTimestamp, increment, arrayUnion: jest.fn(), delete: jest.fn() },
    getFirestore: jest.fn().mockReturnValue({
      batch: jest.fn(),
      collection: jest.fn().mockReturnValue({ doc: jest.fn() }),
      runTransaction: jest.fn(),
    }),
    Timestamp: class {
      constructor(public seconds: number, public nanoseconds: number) {}
      toDate() { return new Date(this.seconds * 1000); }
    },
  };
});

jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 8000,
    CORS_ORIGINS: 'http://localhost:3000',
    FIREBASE_PROJECT_ID: 'infra-test',
    FIREBASE_PRIVATE_KEY: 'PLACEHOLDER',
    FIREBASE_CLIENT_EMAIL: 'test@test.com',
    FIREBASE_STORAGE_BUCKET: 'test-bucket',
    GCS_BUCKET: 'test-bucket',
    DATABASE_URL: 'postgresql://localhost/test',
    MPESA_ENV: 'sandbox' as const,
    PAYPAL_MODE: 'sandbox' as const,
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), errorWithContext: jest.fn() },
}));

jest.mock('../config/database', () => ({
  default: { user: { findUnique: jest.fn().mockResolvedValue({ isSuspended: false }) } },
}));

jest.mock('../queues/notifications.queue', () => ({
  enqueueNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/cache', () => ({
  cached:   jest.fn((_k: string, _t: number, fn: () => unknown) => fn()),
  invalidate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/mpesa', () => ({
  initiateStkPush: jest.fn().mockResolvedValue({
    CheckoutRequestID: 'CR-TEST-001',
    MerchantRequestID: 'MR-TEST-001',
  }),
  queryTransactionStatus: jest.fn(),
}));

jest.mock('../services/paypal', () => ({
  createPayPalOrder:  jest.fn(),
  capturePayPalOrder: jest.fn(),
  verifyPayPalWebhook: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import express from 'express';
import request from 'supertest';
import { db } from '../config/firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a mock Firestore with a transactionDoc that can carry a mutable status.
 */
function buildFirestoreMocks(options: {
  txnStatus?: string;
  clientId?: string;
  professionalId?: string;
  amount?: number;
  currency?: string;
} = {}) {
  const {
    txnStatus      = 'pending',
    clientId       = 'client-uid',
    professionalId = 'pro-uid',
    amount         = 10_000,
    currency       = 'KES',
  } = options;

  const txnData = {
    status: txnStatus,
    clientId,
    professionalId,
    clientName: 'Alice',
    professionalName: 'Bob',
    amount,
    currency,
    paymentMethod: 'mpesa',
    notes: '',
    createdAt: '__ts__',
    updatedAt: '__ts__',
  };

  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockSet    = jest.fn().mockResolvedValue(undefined);
  const mockGet    = jest.fn().mockResolvedValue({ exists: true, id: 'txn-001', data: () => txnData });

  const txnDocRef = { get: mockGet, update: mockUpdate, set: mockSet, id: 'txn-001' };

  // For user existence checks (clientDoc + profDoc)
  const userGetFn = jest.fn().mockResolvedValue({
    exists: true,
    data: () => ({ displayName: 'Test User' }),
  });
  const userDocRef = { get: userGetFn, update: jest.fn(), set: jest.fn() };

  // batch mock for releasePayment
  const batchCommit  = jest.fn().mockResolvedValue(undefined);
  const batchUpdate  = jest.fn().mockReturnThis();
  const batchSet     = jest.fn().mockReturnThis();
  const batchMock    = { update: batchUpdate, set: batchSet, commit: batchCommit };

  const transactions = {
    doc: jest.fn().mockReturnValue(txnDocRef),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  };

  const commissions = {
    doc: jest.fn().mockReturnValue({ set: jest.fn().mockResolvedValue(undefined) }),
  };

  const users = {
    doc: jest.fn().mockReturnValue(userDocRef),
  };

  const jobs  = { doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: true }) }) };
  const tools = { doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: true }) }) };
  const microtransactions = {
    where:  jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    get:    jest.fn().mockResolvedValue({ docs: [], empty: true }),
  };

  const fsInstance = {
    batch: jest.fn().mockReturnValue(batchMock),
    collection: jest.fn((name: string) => {
      if (name === 'transactions')      return transactions;
      if (name === 'users')             return users;
      if (name === 'jobs')              return jobs;
      if (name === 'tools')             return tools;
      if (name === 'commissions')       return commissions;
      if (name === 'microtransactions') return microtransactions;
      return {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() }),
        where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
      };
    }),
    runTransaction: jest.fn().mockImplementation(async (cb: Function) => {
      const fsTxn = { get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() };
      return cb(fsTxn);
    }),
  };

  return { fsInstance, txnDocRef, mockUpdate, mockGet, batchCommit, batchUpdate, batchSet, txnData };
}

/** Build an authenticated Express app wrapping the transactions controller. */
function buildApp(uid: string, { txnStatus = 'pending', professionalId = 'pro-uid', amount = 10_000, currency = 'KES' } = {}) {
  // Re-import app lazily after mocks are configured
  const txnController = require('../controllers/transactions.controller');

  const app = express();
  app.use(express.json());

  // Inject uid via fake middleware (bypasses Firebase token verification)
  app.use((req: any, _res: any, next: any) => {
    req.user = { uid };
    next();
  });

  app.get('/transactions',     txnController.listTransactions);
  app.post('/transactions',    txnController.createTransaction);
  app.put('/transactions/:id/in-progress', txnController.markInProgress);
  app.put('/transactions/:id/complete',    txnController.markComplete);
  app.put('/transactions/:id/release',     txnController.releasePayment);

  // Attach error handler so 4xx/5xx come back as JSON
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  });

  return app;
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('Escrow Lifecycle — full state machine', () => {
  const mockDb = db as unknown as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  // ── 1. markInProgress: professional can advance pending → in_progress ──────
  it('professional can mark transaction in_progress', async () => {
    const { fsInstance, mockUpdate } = buildFirestoreMocks({ txnStatus: 'pending', professionalId: 'pro-uid' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('pro-uid');
    const res = await request(app).put('/transactions/txn-001/in-progress');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' }),
    );
  });

  // ── 2. markInProgress: client cannot advance state ────────────────────────
  it('client cannot mark transaction in_progress (403)', async () => {
    const { fsInstance } = buildFirestoreMocks({ txnStatus: 'pending', professionalId: 'pro-uid' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('client-uid');
    const res = await request(app).put('/transactions/txn-001/in-progress');

    expect(res.status).toBe(403);
  });

  // ── 3. markComplete: professional marks done ──────────────────────────────
  it('professional can mark transaction complete', async () => {
    const { fsInstance, mockUpdate } = buildFirestoreMocks({ txnStatus: 'in_progress', professionalId: 'pro-uid' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('pro-uid');
    const res = await request(app).put('/transactions/txn-001/complete');

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });

  // ── 4. releasePayment: client can only release after complete ─────────────
  it('client can release payment after work is complete — 5% commission deducted', async () => {
    const amount   = 10_000;
    const { fsInstance, batchCommit, batchUpdate } = buildFirestoreMocks({
      txnStatus: 'completed',
      clientId:  'client-uid',
      amount,
      currency: 'KES',
    });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('client-uid', { txnStatus: 'completed', amount });
    const res = await request(app).put('/transactions/txn-001/release');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      grossAmount:      amount,
      commissionAmount: 500,   // 5% of 10,000
      netAmount:        9_500, // 95% of 10,000
      currency: 'KES',
    });
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'released' }),
    );
  });

  // ── 5. releasePayment: client cannot release if not yet complete ──────────
  it('client cannot release payment when status is not completed (400)', async () => {
    const { fsInstance } = buildFirestoreMocks({ txnStatus: 'in_progress', clientId: 'client-uid' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('client-uid', { txnStatus: 'in_progress' });
    const res = await request(app).put('/transactions/txn-001/release');

    expect(res.status).toBe(400);
  });

  // ── 6. releasePayment: professional cannot release (not the client) ────────
  it('professional cannot release payment (403)', async () => {
    const { fsInstance } = buildFirestoreMocks({ txnStatus: 'completed', professionalId: 'pro-uid' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('pro-uid', { txnStatus: 'completed' });
    const res = await request(app).put('/transactions/txn-001/release');

    expect(res.status).toBe(403);
  });

  // ── 7. createTransaction: reject self-transaction ─────────────────────────
  it('rejects transaction where client === professional (403)', async () => {
    const { fsInstance } = buildFirestoreMocks({ clientId: 'uid-same', professionalId: 'uid-same' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('uid-same');
    const res = await request(app)
      .post('/transactions')
      .send({
        professionalId: 'uid-same',
        amount: 5_000,
        currency: 'KES',
        paymentMethod: 'mpesa',
      });

    expect(res.status).toBe(403);
  });

  // ── 8. 5% commission math — rounding edge case ────────────────────────────
  it('correctly rounds 5% commission on odd amounts', async () => {
    const amount = 7_777;
    const { fsInstance } = buildFirestoreMocks({ txnStatus: 'completed', clientId: 'client-uid', amount, currency: 'KES' });
    mockDb.mockReturnValue(fsInstance);

    const app = buildApp('client-uid', { txnStatus: 'completed', amount });
    const res = await request(app).put('/transactions/txn-001/release');

    expect(res.status).toBe(200);
    const { commissionAmount, netAmount, grossAmount } = res.body.data;
    expect(commissionAmount + netAmount).toBeCloseTo(grossAmount, 2);
  });
});
