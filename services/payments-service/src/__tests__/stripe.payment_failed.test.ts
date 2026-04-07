/**
 * Phase 2 — Webhook Stress Tests: payment_intent.payment_failed
 *
 * The Stripe route merges idempotency and business writes into ONE runTransaction
 * call. Within that transaction, txn.get() is called:
 *   Call 1 — idempotency read on `processedWebhooks` collection
 *   Call 2 — business read on `transactions` document (when transactionId present)
 *
 * These tests verify:
 *   • pending  → failed  (normal path)
 *   • completed stays completed even if a late payment_failed arrives (out-of-order)
 *   • Duplicate delivery (same event delivered twice) handled gracefully
 *   • Missing transactionId → no-op, no crash
 *   • Non-existent transaction → no update, no crash
 *
 * Phase 3 — Firestore failures in payment_failed path:
 *   • Firestore throws on business logic → 500, no crash, no silent failure
 */

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../firebase', () => ({
  db: jest.fn(),
  initFirebase: jest.fn(),
}));

const mockConstructEvent = jest.fn();

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

/**
 * Builds a Firestore mock for the payment_failed path.
 *
 * The Stripe webhook route makes ONE runTransaction call that does two
 * sequential txn.get() reads before any writes:
 *   Call 1 — processedRef: idempotency check (not a dup → proceed)
 *   Call 2 — bizRef:       transactions/{txnId} read for conditional update
 *
 * We use sequential mockResolvedValueOnce for txn.get():
 *   First  get() call  → idempotency check result ({ exists: false })
 *   Second get() call  → business logic result    ({ exists, status })
 */
function buildPaymentFailedMock(options: {
  currentStatus?: string;
  docExists?:     boolean;
  throwOnBusinessRead?: boolean;
} = {}) {
  const { currentStatus = 'pending', docExists = true, throwOnBusinessRead = false } = options;

  const mockTxnSet    = jest.fn();
  const mockTxnUpdate = jest.fn().mockResolvedValue(undefined);

  const mockTxnGet = throwOnBusinessRead
    ? jest.fn()
        .mockResolvedValueOnce({ exists: false })   // idempotency: not a dup → proceed
        .mockRejectedValue(new Error('UNAVAILABLE: Firestore not accessible'))
    : jest.fn()
        .mockResolvedValueOnce({ exists: false })   // idempotency: not a dup → proceed
        .mockResolvedValue({ exists: docExists, data: () => ({ status: currentStatus }) });

  const mockTxn = { get: mockTxnGet, set: mockTxnSet, update: mockTxnUpdate };
  const mockRunTransaction = jest.fn().mockImplementation(async (cb: Function) => cb(mockTxn));

  const mockFirestoreInstance = {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({ id: 'mock-ref-id' }),
    }),
    runTransaction: mockRunTransaction,
  };

  return { mockFirestoreInstance, mockTxnUpdate, mockTxnGet, mockTxnSet, mockRunTransaction };
}

function makePaymentFailedEvent(txnId: string, eventId = 'evt_failed_001'): Partial<Stripe.Event> {
  return {
    id:   eventId,
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id:       'pi_failed_001',
        metadata: { transactionId: txnId },
      } as unknown as Stripe.PaymentIntent,
    },
  };
}

const mockDb = db as jest.Mock;

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY     = 'sk_test_xxx';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx';
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Idempotency: payment_intent.payment_failed
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — payment_intent.payment_failed idempotency', () => {

  // ── Normal path: pending → failed ─────────────────────────────────────────
  it('marks a pending transaction as failed', async () => {
    const { mockFirestoreInstance, mockTxnUpdate } =
      buildPaymentFailedMock({ currentStatus: 'pending' });
    mockDb.mockReturnValue(mockFirestoreInstance);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-01'));

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_fail')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    // txn.update(docRef, data) — match the data argument regardless of ref
    expect(mockTxnUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'failed' }),
    );
  });

  // ── CRITICAL: out-of-order delivery — succeeded then failed ───────────────
  it('[CRITICAL] does NOT overwrite completed status on late payment_failed', async () => {
    // Stripe delivers payment_intent.succeeded first → status = 'completed' in DB
    // Then delivers payment_intent.payment_failed late (delayed/network issue)
    // Guard: if existing.status === 'completed' → no-op
    const { mockFirestoreInstance, mockTxnUpdate, mockRunTransaction } =
      buildPaymentFailedMock({ currentStatus: 'completed', docExists: true });
    mockDb.mockReturnValue(mockFirestoreInstance);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-02', 'evt_late_fail'));

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_late_fail')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    // Guard prevented the update — completed must stay completed
    expect(mockTxnUpdate).not.toHaveBeenCalled();
    // Idempotency + business read merged into ONE transaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── Duplicate delivery: same event delivered twice sequentially ───────────
  it('duplicate payment_failed event (second delivery): already in processedWebhooks → no-op', async () => {
    // On second delivery, the idempotency check sees the doc already exists → isDuplicate = true
    const mockTxnSetN  = jest.fn();
    const mockTxnUpdateN = jest.fn();
    // First get: idempotency check → already exists (duplicate)
    const mockTxnGetN = jest.fn().mockResolvedValue({ exists: true });
    const mockTxnN   = { get: mockTxnGetN, set: mockTxnSetN, update: mockTxnUpdateN };
    const mockRunTxN = jest.fn().mockImplementation(async (cb: Function) => cb(mockTxnN));

    mockDb.mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue({}) }),
      runTransaction: mockRunTxN,
    });
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-03', 'evt_dup'));

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_dup')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    // Only the idempotency transaction ran — business logic was skipped
    expect(mockRunTxN).toHaveBeenCalledTimes(1);
    expect(mockTxnUpdateN).not.toHaveBeenCalled();
  });

  // ── Missing transactionId ──────────────────────────────────────────────────
  it('handles missing transactionId in payment_failed metadata gracefully', async () => {
    const { mockFirestoreInstance, mockTxnUpdate } = buildPaymentFailedMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    mockConstructEvent.mockReturnValue({
      id:   'evt_no_txn',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id:       'pi_no_meta',
          metadata: {},  // No transactionId
        } as unknown as Stripe.PaymentIntent,
      },
    });

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_no_meta')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    // Must not crash — no transactionId means no-op for business logic
    expect(res.status).toBe(200);
    expect(mockTxnUpdate).not.toHaveBeenCalled();
  });

  // ── Non-existent transaction ───────────────────────────────────────────────
  it('handles payment_failed for a transaction that does not exist in Firestore', async () => {
    const { mockFirestoreInstance, mockTxnUpdate } =
      buildPaymentFailedMock({ docExists: false });
    mockDb.mockReturnValue(mockFirestoreInstance);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-nonexistent'));

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_nonexist')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    // Guard returns early when doc doesn't exist — no update attempted
    expect(mockTxnUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Failure simulation: Firestore failure in business logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — Firestore failure in payment_failed business transaction', () => {

  it('returns 500 when Firestore throws during business transaction (not a crash)', async () => {
    const { mockFirestoreInstance } = buildPaymentFailedMock({ throwOnBusinessRead: true });
    mockDb.mockReturnValue(mockFirestoreInstance);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-fs-down'));

    const res = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_fs_fail')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    // Service must not crash — returns 500, not an unhandled exception
    expect(res.status).toBe(500);
    expect(res.text).toContain('Internal Server Error');
  });

  it('healthy request succeeds; Firestore-down request returns 500 (fail fast, not crash)', async () => {
    // First request — Firestore healthy
    const { mockFirestoreInstance: goodFs } = buildPaymentFailedMock({ currentStatus: 'pending' });
    mockDb.mockReturnValue(goodFs);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-healthy', 'evt_healthy'));

    const res1 = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_good')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(res1.status).toBe(200);

    // Second request — Firestore down
    const { mockFirestoreInstance: badFs } = buildPaymentFailedMock({ throwOnBusinessRead: true });
    mockDb.mockReturnValue(badFs);
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-unhealthy', 'evt_unhealthy'));

    const res2 = await request(buildTestApp())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'sig_bad')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(res2.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — State machine: 10 concurrent payment_failed events on completed txn
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — State machine: completed payment resists concurrent failed events', () => {

  it('10 concurrent payment_failed events cannot downgrade a completed transaction', async () => {
    const statusWritten: string[] = [];

    // Each request makes ONE runTransaction call. Within that transaction,
    // txn.get() is called twice via Promise.all():
    //   1st get() — processedRef: not a duplicate, proceed into switch
    //   2nd get() — transactions/{txnId}: already completed, guard fires, no update
    const runTransaction = jest.fn().mockImplementation(async (cb: Function) => {
      const txn = {
        get: jest.fn()
          // 1st get(): processedRef — not a duplicate, proceed
          .mockResolvedValueOnce({ exists: false })
          // 2nd get(): bizRef — already completed, guard fires
          .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'completed' }) }),
        set:    jest.fn(),
        update: jest.fn().mockImplementation((_ref: unknown, data: Record<string, unknown>) => {
          statusWritten.push(data.status as string);
          return Promise.resolve();
        }),
      };

      return cb(txn);
    });

    mockDb.mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue({}) }),
      runTransaction,
    });
    mockConstructEvent.mockReturnValue(makePaymentFailedEvent('txn-completed', 'evt_concurrent'));

    const app = buildTestApp();

    // Each request gets a unique signature so the idempotency mock sees them as fresh events.
    // (Event ID is the same so this simulates 10 concurrent retries of the same event.)
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/webhooks/stripe')
          .set('stripe-signature', `sig_concurrent_${i}`)
          .set('Content-Type', 'application/json')
          .send(Buffer.from('{}')),
      ),
    );

    // Guard blocked every update — no 'failed' writes were made against a 'completed' tx
    expect(statusWritten).not.toContain('failed');
    expect(statusWritten.length).toBe(0);
  });
});
