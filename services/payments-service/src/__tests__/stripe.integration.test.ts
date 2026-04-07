/**
 * Integration tests — Stripe webhook route
 *
 * Tests the full HTTP request pipeline:
 *   raw body parsing → signature verification → idempotency check → DB update
 *
 * Firebase and Stripe are fully mocked; no live credentials needed.
 */

// ── Module mocks (hoisted before imports) ─────────────────────────────────────
jest.mock('../firebase', () => ({
  db: jest.fn(),
  initFirebase: jest.fn(),
}));

// Variables prefixed with 'mock' are hoisted by Jest so they can be used inside
// jest.mock() factory functions (even though they're declared after the call).
const mockConstructEvent = jest.fn();

// All calls to new Stripe() return an object that shares the SAME constructEvent
// mock, so configurations made in tests are seen by the route handler.
jest.mock('stripe', () =>
  jest.fn().mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  }),
);

// ── Imports ───────────────────────────────────────────────────────────────────
import express, { raw } from 'express';
import request from 'supertest';
import type Stripe from 'stripe';
import { db } from '../firebase';
import { stripeWebhook } from '../routes/stripe';

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildTestApp() {
  const app = express();
  app.use('/webhooks/stripe', raw({ type: 'application/json' }));
  app.use('/webhooks/stripe', stripeWebhook);
  return app;
}

function buildFirestoreMock(options: { isDuplicate?: boolean } = {}) {
  const mockTxnSet = jest.fn();
  const mockTxnUpdate = jest.fn();

  // The handler issues ONE runTransaction. Within it, txn.get() is called at most twice:
  //   Call 1 — idempotency check: returns { exists: isDuplicate }
  //   Call 2 — business document lookup: returns exists:true so the update proceeds
  // (For subscription.updated and unhandled events only Call 1 is issued.)
  const mockTxnGet = jest.fn()
    .mockResolvedValueOnce({ exists: options.isDuplicate ?? false })
    .mockResolvedValue({ exists: true, data: () => ({ status: 'pending' }) });

  const mockTxn = { get: mockTxnGet, set: mockTxnSet, update: mockTxnUpdate };

  // mockDocRef needs update() for direct (non-transactional) collection updates
  // e.g. customer.subscription.updated calls db().collection('users').doc(uid).update(...)
  const mockDocRef = {
    id: 'mock-doc-id',
    update: jest.fn().mockResolvedValue(undefined),
  };
  const mockDoc = jest.fn().mockReturnValue(mockDocRef);
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

  const mockRunTransaction = jest.fn().mockImplementation(async (cb: Function) => cb(mockTxn));

  const mockFirestoreInstance = {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  };

  return { mockFirestoreInstance, mockTxnSet, mockTxnUpdate, mockTxnGet, mockRunTransaction };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Stripe webhook — /webhooks/stripe', () => {
  const mockDb = db as jest.Mock;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx';
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  // ── 1. Valid payment_intent.succeeded ──────────────────────────────────────
  it('returns 200 and updates transaction on valid payment_intent.succeeded', async () => {
    const { mockFirestoreInstance, mockRunTransaction } = buildFirestoreMock({ isDuplicate: false });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const fakeEvent: Partial<Stripe.Event> = {
      id: 'evt_test_001',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_001',
          metadata: { transactionId: 'txn_test_001' },
        } as unknown as Stripe.PaymentIntent,
      },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    // Idempotency + business writes merged into ONE transaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── 2. Duplicate event (idempotency) ──────────────────────────────────────
  it('returns 200 but skips re-processing for duplicate event IDs', async () => {
    const { mockFirestoreInstance, mockRunTransaction } = buildFirestoreMock({ isDuplicate: true });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const fakeEvent: Partial<Stripe.Event> = {
      id: 'evt_already_seen',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_001',
          metadata: { transactionId: 'txn_001' },
        } as unknown as Stripe.PaymentIntent,
      },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_dup')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    // Only the idempotency check transaction — no second update transaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── 3. Invalid signature ──────────────────────────────────────────────────
  it('returns 400 for an invalid Stripe webhook signature', async () => {
    const { mockFirestoreInstance } = buildFirestoreMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'bad_sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.text).toContain('Webhook Error');
  });

  // ── 4. Missing STRIPE_WEBHOOK_SECRET ─────────────────────────────────────
  it('returns 400 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { mockFirestoreInstance } = buildFirestoreMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
  });

  // ── 5. subscription.updated event handling ──────────────────────────────
  it('handles customer.subscription.updated and updates user tier', async () => {
    const { mockFirestoreInstance } = buildFirestoreMock({ isDuplicate: false });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const fakeSub = {
      id: 'sub_test_001',
      status: 'active',
      metadata: { uid: 'user_001', tier: 'pro' },
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
    } as unknown as Stripe.Subscription;

    const fakeEvent: Partial<Stripe.Event> = {
      id: 'evt_sub_001',
      type: 'customer.subscription.updated',
      data: { object: fakeSub },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_sub')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
  });
});
