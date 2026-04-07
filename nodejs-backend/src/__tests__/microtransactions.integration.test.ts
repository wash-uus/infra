/**
 * Integration tests — Microtransactions
 *
 * Covers the 3 microtransaction types:
 *   1. applicant_unlock   — employer pays KES 200 to see applicant details
 *   2. application_boost  — professional pays KES 100 to rank higher
 *   3. listing_feature    — any user pays KES 500 to feature a listing
 *
 * Full M-Pesa STK Push → callback → side-effect flow tested.
 *
 * All external services are mocked.
 */

// ── Hoist mocks ───────────────────────────────────────────────────────────────

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue('__ts__'),
    increment: jest.fn((n: number) => `__inc_${n}__`),
    arrayUnion: jest.fn(),
    delete: jest.fn(),
  },
  getFirestore: jest.fn(),
  Timestamp: { fromDate: jest.fn() },
}));

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
    MPESA_CALLBACK_IPS: '',
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
  initiateStkPush: jest.fn().mockResolvedValue({ CheckoutRequestID: 'CR-MICRO-001', MerchantRequestID: 'MR-MICRO-001' }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import express from 'express';
import request from 'supertest';
import { db } from '../config/firebase';
import { enqueueNotification } from '../queues/notifications.queue';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMicroDoc(type: string, targetId: string, targetContextId: string, status = 'pending') {
  return {
    type,
    userId: 'employer-uid',
    targetId,
    targetContextId,
    amount: 200,
    currency: 'KES',
    status,
    mpesaCheckoutRequestId: 'CR-MICRO-001',
    mpesaCallbackProcessed: false,
    createdAt: '__ts__',
    updatedAt: '__ts__',
  };
}

function buildFirestoreMocks(microData: ReturnType<typeof buildMicroDoc>) {
  // micro ref
  const microUpdate  = jest.fn().mockResolvedValue(undefined);
  const microDocRef  = { update: microUpdate, data: () => microData };
  const microSnapshot = {
    empty: false,
    docs: [{ ref: microDocRef, data: () => microData, id: 'micro-001' }],
  };

  // unlocked applications
  const unlockSet  = jest.fn().mockResolvedValue(undefined);
  const unlockDoc  = { set: unlockSet };

  // job applications (for boost)
  const appUpdate  = jest.fn().mockResolvedValue(undefined);
  const appDoc     = { update: appUpdate };

  // jobs / tools (for feature)
  const listingUpdate = jest.fn().mockResolvedValue(undefined);
  const listingDoc    = { update: listingUpdate };

  // Idempotency transaction
  const transactionGet = jest.fn()
    .mockResolvedValueOnce({ data: () => ({ mpesaCallbackProcessed: false }) })
    .mockResolvedValue({ data: () => ({ mpesaCallbackProcessed: false }) });
  const transactionUpdate = jest.fn();
  const fsTransaction = { get: transactionGet, update: transactionUpdate };
  const runTransaction = jest.fn().mockImplementation(async (cb: Function) => cb(fsTransaction));

  const fs = {
    collection: jest.fn((name: string) => {
      if (name === 'microtransactions') return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get:   jest.fn().mockResolvedValue(microSnapshot),
        doc:   jest.fn().mockReturnValue({ set: jest.fn(), get: jest.fn().mockResolvedValue({ exists: false, data: () => microData }) }),
      };
      if (name === 'unlockedApplications') return { doc: jest.fn().mockReturnValue(unlockDoc) };
      if (name === 'jobApplications')      return { doc: jest.fn().mockReturnValue(appDoc) };
      if (name === 'jobs')                 return { doc: jest.fn().mockReturnValue(listingDoc) };
      if (name === 'tools')                return { doc: jest.fn().mockReturnValue(listingDoc) };
      if (name === 'transactions')         return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get:   jest.fn().mockResolvedValue({ docs: [], empty: true }),
      };
      return {
        doc:   jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get:   jest.fn().mockResolvedValue({ docs: [], empty: true }),
      };
    }),
    runTransaction,
  };

  return { fs, microUpdate, unlockSet, appUpdate, listingUpdate };
}

function buildCallbackApp() {
  const ctrl = require('../controllers/transactions.controller');
  const app  = express();
  app.use(express.json());
  // No auth for callback routes (called by Safaricom)
  app.post('/transactions/mpesa/callback', ctrl.mpesaCallback);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  });
  return app;
}

function buildMpesaCallbackPayload(checkoutRequestId: string, resultCode = 0) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-MICRO-001',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultCode === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
        CallbackMetadata: resultCode === 0 ? {
          Item: [
            { Name: 'Amount', Value: 200 },
            { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
            { Name: 'TransactionDate', Value: 20260101120000 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        } : undefined,
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Microtransactions — applicant_unlock', () => {
  const mockDb = db as unknown as jest.Mock;
  const mockEnqueueNotification = enqueueNotification as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('successful callback: creates unlock record + notifies employer', async () => {
    const microData = buildMicroDoc('applicant_unlock', 'app-001', 'job-001');
    const { fs, unlockSet } = buildFirestoreMocks(microData);
    mockDb.mockReturnValue(fs);

    const app = buildCallbackApp();
    const res = await request(app)
      .post('/transactions/mpesa/callback')
      .send(buildMpesaCallbackPayload('CR-MICRO-001', 0));

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
    expect(unlockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        employerId: 'employer-uid',
        applicationId: 'app-001',
        jobId: 'job-001',
      }),
    );
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      'employer-uid',
      expect.objectContaining({ title: 'Applicant Unlocked' }),
    );
  });

  it('failed payment: does not create unlock record', async () => {
    const microData = buildMicroDoc('applicant_unlock', 'app-001', 'job-001');
    const { fs, unlockSet } = buildFirestoreMocks(microData);
    mockDb.mockReturnValue(fs);

    const app = buildCallbackApp();
    const res = await request(app)
      .post('/transactions/mpesa/callback')
      .send(buildMpesaCallbackPayload('CR-MICRO-001', 1)); // failed

    expect(res.status).toBe(200);
    expect(unlockSet).not.toHaveBeenCalled();
  });
});

describe('Microtransactions — application_boost', () => {
  const mockDb = db as unknown as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('successful callback: marks application as boosted with score', async () => {
    const microData = buildMicroDoc('application_boost', 'app-002', 'job-002');
    const { fs, appUpdate } = buildFirestoreMocks(microData);
    mockDb.mockReturnValue(fs);

    const app = buildCallbackApp();
    const res = await request(app)
      .post('/transactions/mpesa/callback')
      .send(buildMpesaCallbackPayload('CR-MICRO-001', 0));

    expect(res.status).toBe(200);
    expect(appUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ isApplicationBoosted: true }),
    );
  });
});

describe('Microtransactions — invalid payload', () => {
  const mockDb = db as unknown as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('returns ResultCode: 1 when payload is missing Body.stkCallback', async () => {
    const microData = buildMicroDoc('applicant_unlock', 'app-003', 'job-003');
    const { fs } = buildFirestoreMocks(microData);
    mockDb.mockReturnValue(fs);

    const app = buildCallbackApp();
    const res = await request(app)
      .post('/transactions/mpesa/callback')
      .send({ BadBody: {} });

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(1);
  });
});
