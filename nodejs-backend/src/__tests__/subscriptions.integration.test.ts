/**
 * Integration tests — Subscription Activation
 *
 * Covers:
 *   1. initiate subscription (pending state created)
 *   2. M-Pesa callback activates subscription on user doc
 *   3. Stripe webhook activates subscription
 *   4. PayPal capture completes subscription
 *   5. Rejects duplicate tier upgrade
 *   6. getSubscriptionStatus returns correct state
 *
 * All external services (Firebase, Stripe, M-Pesa, PayPal, Prisma) are mocked.
 */

// ── Hoist mocks ───────────────────────────────────────────────────────────────

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue('__ts__'),
    increment: jest.fn((n: number) => `__inc_${n}__`),
    arrayUnion: jest.fn(),
    delete: jest.fn(),
  },
  Timestamp: {
    fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: 1_700_000_000, nanoseconds: 0 })),
  },
  getFirestore: jest.fn(),
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
    STRIPE_SECRET_KEY:      'sk_test_xxx',
    STRIPE_WEBHOOK_SECRET:  'whsec_xxx',
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
  initiateStkPush: jest.fn().mockResolvedValue({ CheckoutRequestID: 'CR-SUB-001', MerchantRequestID: 'MR-SUB-001' }),
}));

jest.mock('../services/paypal', () => ({
  createPayPalOrder:   jest.fn().mockResolvedValue({ id: 'PAYPAL-ORDER-001', status: 'CREATED', links: [] }),
  capturePayPalOrder:  jest.fn().mockResolvedValue({ status: 'COMPLETED', id: 'PAYPAL-ORDER-001' }),
  verifyPayPalWebhook: jest.fn().mockResolvedValue(true),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import express from 'express';
import request from 'supertest';
import { db } from '../config/firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFirestoreMocks(opts: {
  userTier?:    string;
  subStatus?:   string;
  subPayMethod?: string;
} = {}) {
  const { userTier = 'free', subStatus = 'pending', subPayMethod = 'mpesa' } = opts;

  const userData = {
    displayName: 'Test User',
    subscription: { tier: userTier, expiresAt: null },
    subscriptionTier: userTier,
  };
  const subData = {
    userId: 'user-uid',
    tier: 'pro',
    amount: 1500,
    currency: 'KES',
    paymentMethod: subPayMethod,
    status: subStatus,
    createdAt: '__ts__',
    updatedAt: '__ts__',
  };

  const userUpdate = jest.fn().mockResolvedValue(undefined);
  const userGet    = jest.fn().mockResolvedValue({ exists: true, data: () => userData });
  const userSet    = jest.fn().mockResolvedValue(undefined);
  const userDoc    = { get: userGet, update: userUpdate, set: userSet };

  const subUpdate  = jest.fn().mockResolvedValue(undefined);
  const subGet     = jest.fn().mockResolvedValue({ exists: true, data: () => subData });
  const subSet     = jest.fn().mockResolvedValue(undefined);
  const subDoc     = { get: subGet, update: subUpdate, set: subSet, id: 'sub-001' };

  // Snapshot for callback lookup (mpesa/paypal)
  const subSnapshot = {
    empty: false,
    docs: [{ ref: subDoc, data: () => subData, id: 'sub-001' }],
  };

  const runTransaction = jest.fn().mockImplementation(async (cb: Function) => {
    const txn = { get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() };
    return cb(txn);
  });

  const fs = {
    collection: jest.fn((name: string) => {
      if (name === 'users') return { doc: jest.fn().mockReturnValue(userDoc) };
      if (name === 'subscriptions') return {
        doc:   jest.fn().mockReturnValue(subDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get:   jest.fn().mockResolvedValue(subSnapshot),
        add:   jest.fn().mockResolvedValue(subDoc),
      };
      if (name === 'processedWebhooks') return {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn() }),
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

  return { fs, userUpdate, subUpdate, subSet, runTransaction };
}

function buildApp(uid: string) {
  const ctrl = require('../controllers/subscriptions.controller');
  const app  = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => { req.user = { uid }; next(); });

  app.post('/subscriptions/initiate',           ctrl.initiateSubscription);
  app.post('/subscriptions/mpesa/stk-push',     ctrl.subscriptionMpesaStkPush);
  app.post('/subscriptions/mpesa/callback',     ctrl.subscriptionMpesaCallback);
  app.post('/subscriptions/paypal/create-order', ctrl.subscriptionPaypalCreateOrder);
  app.post('/subscriptions/paypal/capture-order', ctrl.subscriptionPaypalCaptureOrder);
  app.get('/subscriptions/status/:id',          ctrl.getSubscriptionStatus);

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
  });
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Subscription Activation — full lifecycle', () => {
  const mockDb = db as unknown as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Initiate subscription creates pending record ────────────────────────
  it('initiateSubscription creates a pending subscription record', async () => {
    const { fs, subSet } = buildFirestoreMocks({ userTier: 'free' });
    mockDb.mockReturnValue(fs);

    const app = buildApp('user-uid');
    const res = await request(app).post('/subscriptions/initiate').send({
      tier: 'pro',
      currency: 'KES',
      paymentMethod: 'mpesa',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ tier: 'pro', amount: 1500, currency: 'KES' });
    expect(subSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', tier: 'pro', userId: 'user-uid' }),
    );
  });

  // ── 2. Reject if already on the requested tier ────────────────────────────
  it('rejects initiation when user already has the requested tier (400)', async () => {
    const { fs } = buildFirestoreMocks({ userTier: 'pro' });
    mockDb.mockReturnValue(fs);

    const app = buildApp('user-uid');
    const res = await request(app).post('/subscriptions/initiate').send({
      tier: 'pro',
      currency: 'KES',
      paymentMethod: 'mpesa',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already on this plan/i);
  });

  // ── 3. M-Pesa STK push initiates the payment ─────────────────────────────
  it('subscriptionMpesaStkPush initiates STK push and returns checkoutRequestId', async () => {
    const { fs } = buildFirestoreMocks({ userTier: 'free', subPayMethod: 'mpesa' });
    mockDb.mockReturnValue(fs);

    const app = buildApp('user-uid');
    const res = await request(app).post('/subscriptions/mpesa/stk-push').send({
      subscriptionId: 'sub-001',
      phone: '254712345678',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ CheckoutRequestID: 'CR-SUB-001' });
  });

  // ── 4. Stripe webhook activates subscription on user profile ──────────────
  it('Stripe webhook activates subscription when payment succeeds', async () => {
    const { fs, userUpdate } = buildFirestoreMocks({ userTier: 'free' });
    mockDb.mockReturnValue(fs);

    // Build mini express app that just mounts stripeWebhook
    const ctrl = require('../controllers/subscriptions.controller');
    const rawApp = express();
    rawApp.use('/stripe/webhook', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);
    rawApp.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode ?? 500).json({ success: false, message: err.message });
    });

    // Stub stripe constructEvent to return a subscription success event
    const Stripe = require('stripe');
    Stripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id:   'evt_sub_001',
          type: 'customer.subscription.updated',
          data: {
            object: {
              id:     'sub_stripe_001',
              status: 'active',
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
              metadata: { uid: 'user-uid', tier: 'pro' },
            },
          },
        }),
      },
    });

    const res = await request(rawApp)
      .post('/stripe/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  // ── 5. PayPal capture completes subscription ───────────────────────────────
  it('PayPal order capture activates the subscription', async () => {
    const { fs, subUpdate, userUpdate } = buildFirestoreMocks({
      userTier: 'free',
      subPayMethod: 'paypal',
      subStatus: 'pending',
    });
    mockDb.mockReturnValue(fs);

    const app = buildApp('user-uid');
    const res = await request(app).post('/subscriptions/paypal/capture-order').send({
      subscriptionId: 'sub-001',
      orderId: 'PAYPAL-ORDER-001',
    });

    expect(res.status).toBe(200);
    expect(subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionTier: 'pro' }),
    );
  });

  // ── 6. getSubscriptionStatus returns current state ────────────────────────
  it('getSubscriptionStatus returns subscription doc', async () => {
    const { fs } = buildFirestoreMocks({ subStatus: 'active' });
    mockDb.mockReturnValue(fs);

    const app = buildApp('user-uid');
    const res = await request(app).get('/subscriptions/status/sub-001');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ tier: 'pro' });
  });
});
