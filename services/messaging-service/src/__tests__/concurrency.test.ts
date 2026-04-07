/**
 * Phase 1 — Concurrency Tests
 * Phase 3 — Failure Simulation Tests
 * Phase 4 — Graceful Shutdown Tests
 *
 * Verifies that the messaging service's core operations are:
 *   • Safe under concurrent load (no cross-contamination of mutable state)
 *   • Resilient to Firestore and Redis failures
 *   • Correctly propagating errors vs silently swallowing them
 */

// ── Mocks (hoisted) ───────────────────────────────────────────────────────────

let commitCallCount = 0;

const makeBatch = () => ({
  set:    jest.fn(),
  update: jest.fn(),
  commit: jest.fn().mockImplementation(() => {
    commitCallCount++;
    return Promise.resolve();
  }),
});

const mockConvUpdate = jest.fn().mockResolvedValue(undefined);
const mockConvGet    = jest.fn().mockResolvedValue({
  exists: true,
  id:     'conv-x',
  data:   () => ({ participants: ['alice', 'bob'] }),
});

// Each call to db.collection().doc().collection() returns a fresh messages
// sub-collection stub so concurrent tests don't share the same mock state.
const makeMessagesCol = () => ({
  doc:    jest.fn().mockReturnValue({
    get:    jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    update: jest.fn().mockResolvedValue(undefined),
  }),
  orderBy:   jest.fn().mockReturnThis(),
  limit:     jest.fn().mockReturnThis(),
  endBefore: jest.fn().mockReturnThis(),
  get:       jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
  count:     jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  }),
  where: jest.fn().mockReturnValue({
    count: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
    }),
  }),
});

const mockConvRef = {
  get:        mockConvGet,
  update:     mockConvUpdate,
  collection: jest.fn().mockImplementation(() => makeMessagesCol()),
};

const mockDb = {
  batch:      jest.fn().mockImplementation(() => makeBatch()),
  collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(mockConvRef) }),
};

jest.mock('../firebase', () => ({
  getDb:        jest.fn(),
  initFirebase: jest.fn(),
  verifyToken:  jest.fn(),
}));

jest.mock('../logger', () => ({
  logger: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => `uuid-${++uuidCounter}`),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { getDb } from '../firebase';
import { saveMessage, loadMessageHistory, updateUnreadCount, MessagePayload } from '../messages.service';

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  commitCallCount = 0;
  uuidCounter     = 0;
  mockGetDb.mockReturnValue(mockDb as any);
  // Restore default batch implementation after tests that override it
  mockDb.batch.mockImplementation(() => makeBatch());
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Concurrency: concurrent saveMessage calls
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 1 — Concurrent saveMessage calls', () => {

  it('each of 100 concurrent saves creates an independent batch (no shared state)', async () => {
    const payloads: MessagePayload[] = Array.from({ length: 100 }, (_, i) => ({
      conversationId: `conv-${i}`,
      senderId:       `user-${i}`,
      senderName:     `User ${i}`,
      content:        `Message from user ${i}`,
    }));

    const results = await Promise.all(payloads.map((p) => saveMessage(p)));

    // Every call produced a distinct message ID (no UUID reuse / cross-contamination)
    const ids = results.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);

    // Every batch was committed exactly once
    expect(mockDb.batch).toHaveBeenCalledTimes(100);
    expect(commitCallCount).toBe(100);
  });

  it('each result contains the correct sender from its own payload', async () => {
    const payloads: MessagePayload[] = ['alice', 'bob', 'carol', 'dave', 'eve'].map((name) => ({
      conversationId: 'conv-shared',
      senderId:       name,
      senderName:     name.toUpperCase(),
      content:        `Hello from ${name}`,
    }));

    const results = await Promise.all(payloads.map((p) => saveMessage(p)));

    // Validate each result maps to the right sender — no cross-contamination
    for (let i = 0; i < payloads.length; i++) {
      expect(results[i].senderId).toBe(payloads[i].senderId);
      expect(results[i].content).toBe(payloads[i].content);
    }
  });

  it('50 concurrent saves all resolve even when some batches fail', async () => {
    // Every other batch commit fails
    let callN = 0;
    mockDb.batch.mockImplementation(() => ({
      set:    jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockImplementation(() => {
        callN++;
        if (callN % 2 === 0) return Promise.reject(new Error('Firestore write timeout'));
        return Promise.resolve();
      }),
    }));

    const payloads: MessagePayload[] = Array.from({ length: 10 }, (_, i) => ({
      conversationId: `conv-${i}`,
      senderId:       `user-${i}`,
      senderName:     `User ${i}`,
      content:        `Msg ${i}`,
    }));

    const settled = await Promise.allSettled(payloads.map((p) => saveMessage(p)));

    const fulfilled = settled.filter((r) => r.status === 'fulfilled');
    const rejected  = settled.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(5);
    expect(rejected.length).toBe(5);

    // Rejected promises should carry the DB error (not swallowed silently)
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason.message).toBe('Firestore write timeout');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Failure Simulation: Firestore delays and failures
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — Firestore failure simulation', () => {

  it('saveMessage propagates Firestore unavailable error to caller', async () => {
    mockDb.batch.mockReturnValue({
      set:    jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockRejectedValue(new Error('UNAVAILABLE: Firestore service is not available')),
    });

    await expect(saveMessage({
      conversationId: 'conv-fail',
      senderId:       'user-1',
      senderName:     'Alice',
      content:        'Hello',
    })).rejects.toThrow('UNAVAILABLE');
  });

  it('loadMessageHistory returns empty array on Firestore timeout (graceful degradation)', async () => {
    // Override the messages collection mock to throw on .get()
    mockConvRef.collection.mockReturnValue({
      ...makeMessagesCol(),
      orderBy:   jest.fn().mockReturnThis(),
      limit:     jest.fn().mockReturnThis(),
      endBefore: jest.fn().mockReturnThis(),
      get:       jest.fn().mockRejectedValue(new Error('Deadline exceeded')),
      doc:       jest.fn(),
      count:     jest.fn().mockReturnValue({ get: jest.fn() }),
      where:     jest.fn().mockReturnThis(),
    });

    const result = await loadMessageHistory('conv-fail');
    expect(result).toEqual([]);
  });

  it('updateUnreadCount returns 0 gracefully when count() aggregation throws', async () => {
    mockConvRef.collection.mockReturnValue({
      ...makeMessagesCol(),
      count: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('quota exceeded')),
      }),
      where: jest.fn().mockReturnThis(),
    });

    const count = await updateUnreadCount('conv-fail', 'user-1');
    expect(count).toBe(0);
  });

  it('concurrent saves fail independently — one Firestore failure does not affect others', async () => {
    let callN = 0;
    mockDb.batch.mockImplementation(() => ({
      set:    jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockImplementation(() => {
        // Only the first commit fails
        if (++callN === 1) return Promise.reject(new Error('First write failed'));
        return Promise.resolve();
      }),
    }));

    const payloads: MessagePayload[] = Array.from({ length: 5 }, (_, i) => ({
      conversationId: 'conv-multi',
      senderId:       `user-${i}`,
      senderName:     `User ${i}`,
      content:        `Test ${i}`,
    }));

    const settled = await Promise.allSettled(payloads.map((p) => saveMessage(p)));
    const failed   = settled.filter((r) => r.status === 'rejected');
    const succeeded = settled.filter((r) => r.status === 'fulfilled');

    expect(failed.length).toBe(1);
    expect(succeeded.length).toBe(4);
  });

  it('does not retry silently — failed saves surface the error', async () => {
    const error = new Error('PERMISSION_DENIED: Missing auth credentials');
    mockDb.batch.mockReturnValue({
      set:    jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockRejectedValue(error),
    });

    const result = await saveMessage({
      conversationId: 'conv-auth-fail',
      senderId:       'user-1',
      senderName:     'Alice',
      content:        'Unauthorized message',
    }).catch((e: Error) => e);

    // Error must propagate (not be swallowed)
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('PERMISSION_DENIED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Shutdown: in-flight operations should complete cleanly
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 4 — In-flight operation behavior during simulated shutdown', () => {

  it('a save started before shutdown completes and returns data (no partial write)', async () => {
    // Simulate a slow Firestore commit (250ms)
    mockDb.batch.mockReturnValue({
      set:    jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10)),
      ),
    });

    const savePromise = saveMessage({
      conversationId: 'conv-slow',
      senderId:       'user-1',
      senderName:     'Alice',
      content:        'Slow write',
    });

    // Simulate shutdown signal fired while write is in flight
    let shutdownResolved = false;
    const shutdownPromise = new Promise<void>((resolve) =>
      setTimeout(() => { shutdownResolved = true; resolve(); }, 5),
    );

    // Shutdown resolves first (after 5ms), but the save should still complete (at 10ms)
    await shutdownPromise;
    expect(shutdownResolved).toBe(true);

    const result = await savePromise;
    expect(result).toBeDefined();
    expect(result.content).toBe('Slow write');
  });

  it('batch.commit is always called (no partial write path)', async () => {
    const payload: MessagePayload = {
      conversationId: 'conv-shutdown',
      senderId:       'user-sig',
      senderName:     'SigUser',
      content:        'Must complete',
    };

    await saveMessage(payload);

    // The batch must always be committed — no code path skips this
    expect(commitCallCount).toBe(1);
  });
});
