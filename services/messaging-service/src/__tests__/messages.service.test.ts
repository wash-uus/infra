/**
 * Messaging Service — Unit Tests
 *
 * Tests the messages.service.ts operations (saveMessage, loadMessageHistory,
 * markMessageRead, updateUnreadCount, getConversation) with fully mocked
 * Firestore. No real Firebase connection is made.
 */

// ── Firestore mock ────────────────────────────────────────────────────────────

const makeQuerySnap = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  size: docs.length,
  empty: docs.length === 0,
});

// Leaf message document ref
const mockMessageRef = {
  id:     'msg-123',
  get:    jest.fn().mockResolvedValue({ exists: false, id: 'msg-123', data: () => ({}) }),
  update: jest.fn().mockResolvedValue(undefined),
  set:    jest.fn().mockResolvedValue(undefined),
};

// messages sub-collection ref (chainable)
// countQuery stubs — separate mocks for total vs read counts so tests can set them independently
const mockTotalCountGet = jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) });
const mockReadCountGet  = jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) });
const mockWhereForCount = { count: jest.fn().mockReturnValue({ get: mockReadCountGet }) };

const mockMessagesCol = {
  orderBy:   jest.fn().mockReturnThis(),
  limit:     jest.fn().mockReturnThis(),
  endBefore: jest.fn().mockReturnThis(),
  get:       jest.fn().mockResolvedValue(makeQuerySnap([])),
  doc:       jest.fn().mockReturnValue(mockMessageRef),
  count:     jest.fn().mockReturnValue({ get: mockTotalCountGet }),
  where:     jest.fn().mockReturnValue(mockWhereForCount),
};

// conversation document ref
const mockConvRef: Record<string, jest.Mock> = {
  get:        jest.fn().mockResolvedValue({ exists: false, id: 'conv-abc', data: () => ({}) }),
  update:     jest.fn().mockResolvedValue(undefined),
  collection: jest.fn().mockReturnValue(mockMessagesCol),
};

// conversations collection ref
const mockConvsCol = {
  doc: jest.fn().mockReturnValue(mockConvRef),
};

// batch ref
const mockBatch = {
  set:    jest.fn(),
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

// db root
const mockDb = {
  batch:      jest.fn().mockReturnValue(mockBatch),
  collection: jest.fn().mockReturnValue(mockConvsCol),
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

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { getDb } from '../firebase';
import {
  saveMessage,
  loadMessageHistory,
  markMessageRead,
  updateUnreadCount,
  getConversation,
  StoredMessage,
  MessagePayload,
} from '../messages.service';

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

// Wire up getDb → mockDb before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockReturnValue(mockDb as any);
  // restore sensible defaults
  mockBatch.commit.mockResolvedValue(undefined);
  mockConvRef.get.mockResolvedValue({ exists: false, id: 'conv-abc', data: () => ({}) });
  mockConvRef.update.mockResolvedValue(undefined);
  mockMessagesCol.get.mockResolvedValue(makeQuerySnap([]));
  mockMessageRef.get.mockResolvedValue({ exists: false, id: 'msg-123', data: () => ({}) });
  mockMessageRef.update.mockResolvedValue(undefined);
  // reset count stubs
  mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
  mockReadCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const samplePayload: MessagePayload = {
  conversationId: 'conv-abc',
  senderId:       'user-1',
  senderName:     'Alice',
  content:        'Hello world',
};

function makeConvSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return { exists, id: 'conv-abc', data: () => data };
}

function makeMessageSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return { exists, id: 'msg-123', data: () => data };
}

// ─────────────────────────────────────────────────────────────────────────────
// saveMessage
// ─────────────────────────────────────────────────────────────────────────────

describe('saveMessage', () => {

  it('returns a StoredMessage with the expected shape', async () => {
    const result = await saveMessage(samplePayload);

    expect(result).toMatchObject({
      conversationId: 'conv-abc',
      senderId:       'user-1',
      senderName:     'Alice',
      content:        'Hello world',
      isRead:         false,
      readBy:         ['user-1'],
    });
    expect(result.id).toBeDefined();
  });

  it('calls batch.set on the message doc', async () => {
    await saveMessage(samplePayload);
    expect(mockBatch.set).toHaveBeenCalled();
  });

  it('calls batch.update on the conversation doc', async () => {
    await saveMessage(samplePayload);
    expect(mockBatch.update).toHaveBeenCalled();
  });

  it('commits the batch', async () => {
    await saveMessage(samplePayload);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('truncates long content to 200 chars in conversation metadata', async () => {
    const longContent = 'x'.repeat(300);
    await saveMessage({ ...samplePayload, content: longContent });
    const updateCall = mockBatch.update.mock.calls[0][1];
    expect(updateCall.lastMessage.length).toBe(200);
  });

  it('includes optional attachment fields when provided', async () => {
    const result = await saveMessage({
      ...samplePayload,
      attachmentUrl:  'https://cdn.infra.io/file.pdf',
      attachmentType: 'pdf',
    });
    expect(result.attachmentUrl).toBe('https://cdn.infra.io/file.pdf');
    expect(result.attachmentType).toBe('pdf');
  });

  it('throws when batch.commit fails', async () => {
    mockBatch.commit.mockRejectedValue(new Error('Firestore unavailable'));
    await expect(saveMessage(samplePayload)).rejects.toThrow('Firestore unavailable');
  });

  it('sets senderId as sole initial member of readBy', async () => {
    const result = await saveMessage({ ...samplePayload, senderId: 'user-42' });
    expect(result.readBy).toEqual(['user-42']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadMessageHistory
// ─────────────────────────────────────────────────────────────────────────────

describe('loadMessageHistory', () => {
  it('returns empty array when no messages exist', async () => {
    const result = await loadMessageHistory('conv-abc');
    expect(result).toEqual([]);
  });

  it('returns messages in chronological order (reversed from query)', async () => {
    const docs = [
      { id: 'm3', data: { content: 'Third', createdAt: { seconds: 3 } } },
      { id: 'm2', data: { content: 'Second', createdAt: { seconds: 2 } } },
      { id: 'm1', data: { content: 'First', createdAt: { seconds: 1 } } },
    ];
    mockMessagesCol.get.mockResolvedValue(makeQuerySnap(docs));

    const result = await loadMessageHistory('conv-abc');
    expect(result[0].content).toBe('First');
    expect(result[2].content).toBe('Third');
  });

  it('returns empty array on Firestore error (graceful degradation)', async () => {
    mockMessagesCol.get.mockRejectedValue(new Error('timeout'));
    const result = await loadMessageHistory('conv-abc');
    expect(result).toEqual([]);
  });

  it('passes limit to Firestore query', async () => {
    await loadMessageHistory('conv-abc', 10);
    expect(mockMessagesCol.limit).toHaveBeenCalledWith(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markMessageRead
// ─────────────────────────────────────────────────────────────────────────────

describe('markMessageRead', () => {

  it('adds userId to readBy and sets isRead=true', async () => {
    mockMessageRef.get.mockResolvedValue(
      makeMessageSnap(true, { readBy: ['user-1'], isRead: false }),
    );

    await markMessageRead('conv-abc', 'msg-123', 'user-2');

    expect(mockMessageRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ readBy: ['user-1', 'user-2'], isRead: true }),
    );
  });

  it('does not add userId to readBy if already present (idempotent)', async () => {
    mockMessageRef.get.mockResolvedValue(
      makeMessageSnap(true, { readBy: ['user-1', 'user-2'], isRead: true }),
    );

    await markMessageRead('conv-abc', 'msg-123', 'user-2');

    const call = mockMessageRef.update.mock.calls[0][0];
    expect(call.readBy).toEqual(['user-1', 'user-2']); // no duplicates
  });

  it('does not throw when message not found (returns early)', async () => {
    mockMessageRef.get.mockResolvedValue(makeMessageSnap(false));
    await expect(markMessageRead('conv-abc', 'missing-id', 'user-1')).resolves.toBeUndefined();
  });

  it('does not throw when Firestore update fails (non-critical operation)', async () => {
    mockMessageRef.get.mockResolvedValue(
      makeMessageSnap(true, { readBy: [] }),
    );
    mockMessageRef.update.mockRejectedValue(new Error('write denied'));
    await expect(markMessageRead('conv-abc', 'msg-123', 'user-1')).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateUnreadCount
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// updateUnreadCount — uses count() aggregation (not full doc scan)
// ─────────────────────────────────────────────────────────────────────────────

describe('updateUnreadCount', () => {
  it('returns total minus read count for the given userId', async () => {
    // 3 total messages, 1 already read by user-1 → 2 unread
    mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 3 }) });
    mockReadCountGet.mockResolvedValue({ data: () => ({ count: 1 }) });

    const count = await updateUnreadCount('conv-abc', 'user-1');
    expect(count).toBe(2);
  });

  it('returns 0 when all messages are read', async () => {
    mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 2 }) });
    mockReadCountGet.mockResolvedValue({ data: () => ({ count: 2 }) });

    const count = await updateUnreadCount('conv-abc', 'user-1');
    expect(count).toBe(0);
  });

  it('returns 0 when there are no messages at all', async () => {
    mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
    mockReadCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });

    const count = await updateUnreadCount('conv-abc', 'user-1');
    expect(count).toBe(0);
  });

  it('uses array-contains filter on readBy field', async () => {
    mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 5 }) });
    mockReadCountGet.mockResolvedValue({ data: () => ({ count: 3 }) });

    await updateUnreadCount('conv-abc', 'user-1');

    expect(mockMessagesCol.where).toHaveBeenCalledWith('readBy', 'array-contains', 'user-1');
  });

  it('updates conversation metadata with the computed count', async () => {
    mockTotalCountGet.mockResolvedValue({ data: () => ({ count: 4 }) });
    mockReadCountGet.mockResolvedValue({ data: () => ({ count: 1 }) });

    await updateUnreadCount('conv-abc', 'user-99');

    expect(mockConvRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ 'unreadCounts.user-99': 3 }),
    );
  });

  it('returns 0 on Firestore count error (graceful degradation)', async () => {
    mockTotalCountGet.mockRejectedValue(new Error('quota exceeded'));
    const count = await updateUnreadCount('conv-abc', 'user-1');
    expect(count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getConversation
// ─────────────────────────────────────────────────────────────────────────────

describe('getConversation', () => {
  it('returns conversation data when it exists', async () => {
    const convData = {
      participants:     ['user-1', 'user-2'],
      participantNames: { 'user-1': 'Alice', 'user-2': 'Bob' },
    };
    mockConvRef.get.mockResolvedValue(makeConvSnap(true, convData));

    const conv = await getConversation('conv-abc');
    expect(conv).not.toBeNull();
    expect(conv!.participants).toEqual(['user-1', 'user-2']);
    expect(conv!.id).toBe('conv-abc');
  });

  it('returns null when conversation does not exist', async () => {
    // default mockConvRef.get already returns { exists: false }
    const conv = await getConversation('missing-conv');
    expect(conv).toBeNull();
  });

  it('returns null on Firestore error (graceful degradation)', async () => {
    mockConvRef.get.mockRejectedValue(new Error('permission denied'));
    const conv = await getConversation('conv-abc');
    expect(conv).toBeNull();
  });
});
