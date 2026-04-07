/**
 * Integration tests — M-Pesa STK Push callback route
 *
 * Tests the full HTTP pipeline:
 *   IP allowlist → payload validation → idempotency → DB update
 *
 * Firebase is fully mocked; no live credentials needed.
 */

// ── Module mocks (hoisted before imports) ─────────────────────────────────────
jest.mock('../firebase', () => ({
  db: jest.fn(),
  initFirebase: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────
import express from 'express';
import request from 'supertest';
import { db } from '../firebase';
import { mpesaWebhook } from '../routes/mpesa';

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/webhooks/mpesa', mpesaWebhook);
  return app;
}

function buildFirestoreMock(options: { isDuplicate?: boolean; txnExists?: boolean } = {}) {
  const mockTxnSet = jest.fn();
  const mockTxnUpdate = jest.fn();

  // The handler issues ONE runTransaction. Within it txn.get() is called twice
  // via Promise.all() to read both docs before any writes:
  //   Call 1 — idempotency check:      returns { exists: isDuplicate }
  //   Call 2 — transaction document:   returns { exists: txnExists, status }
  const mockTxnGet = jest.fn()
    .mockResolvedValueOnce({
      exists: options.isDuplicate ?? false,
    })
    .mockResolvedValueOnce({
      exists: options.txnExists ?? false,
      data: () => ({ status: 'pending' }),
    });

  const mockTxn = { get: mockTxnGet, set: mockTxnSet, update: mockTxnUpdate };
  const mockDocRef = { id: 'mock-doc' };
  const mockDoc = jest.fn().mockReturnValue(mockDocRef);
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
  const mockRunTransaction = jest.fn().mockImplementation(async (cb: Function) => cb(mockTxn));

  return {
    mockFirestoreInstance: { collection: mockCollection, runTransaction: mockRunTransaction },
    mockTxnUpdate,
    mockRunTransaction,
  };
}

function buildMpesaPayload(
  checkoutRequestId: string,
  resultCode: number = 0,
): object {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'MR-001',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultCode === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('M-Pesa webhook — /webhooks/mpesa', () => {
  const mockDb = db as jest.Mock;

  afterEach(() => {
    delete process.env.MPESA_CALLBACK_IPS;
  });

  // ── 1. Successful callback updates transaction ──────────────────────────────
  it('returns ResultCode 0 and updates transaction to completed on success', async () => {
    const { mockFirestoreInstance, mockRunTransaction } = buildFirestoreMock({
      isDuplicate: false,
      txnExists: true,
    });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send(buildMpesaPayload('CR-001', 0));

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
    // Idempotency + business writes merged into ONE transaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── 2. Failed payment callback ─────────────────────────────────────────────
  it('marks transaction as failed when ResultCode != 0', async () => {
    const { mockFirestoreInstance, mockRunTransaction } = buildFirestoreMock({
      isDuplicate: false,
      txnExists: true,
    });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send(buildMpesaPayload('CR-002', 1032)); // 1032 = user cancelled

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0); // We always acknowledge to Safaricom
    // Idempotency + business writes merged into ONE transaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── 3. Idempotency: duplicate CheckoutRequestID ────────────────────────────
  it('returns ResultCode 0 without re-processing a duplicate CheckoutRequestID', async () => {
    const { mockFirestoreInstance, mockRunTransaction } = buildFirestoreMock({
      isDuplicate: true,
    });
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send(buildMpesaPayload('CR-DUP-001', 0));

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
    // Only the idempotency check — no second runTransaction
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  // ── 4. Missing CheckoutRequestID ──────────────────────────────────────────
  it('returns ResultCode 1 when CheckoutRequestID is absent', async () => {
    const { mockFirestoreInstance } = buildFirestoreMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send({ Body: { stkCallback: { ResultCode: 0 } } }); // no CheckoutRequestID

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(1);
  });

  // ── 5. Missing Body entirely ──────────────────────────────────────────────
  it('returns ResultCode 1 when Body is missing', async () => {
    const { mockFirestoreInstance } = buildFirestoreMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(1);
  });

  // ── 6. IP allowlist enforcement ────────────────────────────────────────────
  it('returns 403 when source IP is not in MPESA_CALLBACK_IPS allowlist', async () => {
    process.env.MPESA_CALLBACK_IPS = '196.201.214.200,196.201.214.206';

    const { mockFirestoreInstance } = buildFirestoreMock();
    mockDb.mockReturnValue(mockFirestoreInstance);

    const app = buildTestApp();
    // supertest sends from 127.0.0.1, which is not in the allowlist
    const res = await request(app)
      .post('/webhooks/mpesa')
      .send(buildMpesaPayload('CR-IP-001', 0));

    expect(res.status).toBe(403);
    expect(res.body.ResultCode).toBe(1);
  });
});
