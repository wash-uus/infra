/**
 * Admin Controller Unit Tests
 *
 * Tests admin operations: stats, user management (ban/unban/verify), job/tool
 * management, broadcasts, and audit logging.
 *
 * Strategy: mock `../config/firebase` directly so `col.*` references in the
 * controller use test-controlled Firestore chain mocks — no real Firebase.
 */

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

// Mock firebase-admin/firestore so direct getFirestore() calls in other controllers don't crash
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      where:   jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit:   jest.fn().mockReturnThis(),
      get:     jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
    }),
  }),
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue('__server_timestamp__'),
    increment:       jest.fn((n: number) => `__increment_${n}__`),
    arrayUnion:      jest.fn((...args: unknown[]) => ({ _type: 'arrayUnion', values: args })),
    delete:          jest.fn().mockReturnValue('__delete__'),
  },
  Timestamp: class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    toDate() { return new Date(this.seconds * 1000); }
    static now() { return new (this as any)(1_700_000_000, 0); }
  },
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file:   jest.fn().mockReturnValue({ save: jest.fn(), delete: jest.fn(), exists: jest.fn().mockResolvedValue([false]) }),
      upload: jest.fn(),
    }),
  })),
}));

jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 8000,
    CORS_ORIGINS: 'http://localhost:3000',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_PRIVATE_KEY: 'test-key',
    FIREBASE_CLIENT_EMAIL: 'test@test.com',
    FIREBASE_STORAGE_BUCKET: 'test-bucket',
    GCS_BUCKET: 'test-bucket',
    GCS_SIGNED_URL_TTL: 900,
    MPESA_ENV: 'sandbox' as const,
    PAYPAL_MODE: 'sandbox' as const,
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info:             jest.fn(),
    warn:             jest.fn(),
    error:            jest.fn(),
    debug:            jest.fn(),
    errorWithContext: jest.fn(),
  },
}));

jest.mock('../utils/auditLog', () => ({
  logAdminAction:            jest.fn(),
  requireConfirmationHeader: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'admin-uid-001', role: 'admin', email: 'admin@infrasells.com' };
    next();
  },
  requireAdmin:      (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
  requireModerator:  (_req: any, _res: any, next: any) => next(),
  requireRole:       () => (_req: any, _res: any, next: any) => next(),
  optionalAuth:      (_req: any, _res: any, next: any) => next(),
}));

// ── Firestore helpers ─────────────────────────────────────────────────────────

type DocData = Record<string, unknown>;

function makeDocRef(data: DocData | null, id = 'doc1') {
  const snap = { exists: data !== null, id, data: () => data ?? undefined };
  return {
    id,
    get:    jest.fn().mockResolvedValue(snap),
    update: jest.fn().mockResolvedValue(undefined),
    set:    jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCollection(docs: Array<{ id: string; data: DocData }> = []) {
  const snaps = docs.map((d) => ({ id: d.id, exists: true, data: () => d.data }));
  return {
    where:   jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset:  jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    get:     jest.fn().mockResolvedValue({ docs: snaps, size: snaps.length }),
    count:   () => ({
      get: jest.fn().mockResolvedValue({ data: () => ({ count: docs.length }) }),
    }),
    doc:     jest.fn().mockImplementation((id?: string) =>
      makeDocRef(docs.find((d) => d.id === id)?.data ?? docs[0]?.data ?? null, id ?? docs[0]?.id ?? 'doc1'),
    ),
    add:     jest.fn().mockResolvedValue({ id: 'new-doc' }),
  };
}

// ── Build the col mock (all collections empty by default) ─────────────────────

const mockAuthAdmin = {
  revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  setCustomUserClaims:  jest.fn().mockResolvedValue(undefined),
};

const mockFcm = {
  sendToTopic: jest.fn().mockResolvedValue('msg-id'),
};

const mockDb = {
  batch: jest.fn().mockReturnValue({
    set:    jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
  // Default implementation so module-level code in ledger.service.ts
  // (db.collection('ledger_meta').doc('balance')) doesn't throw on load.
  collection: jest.fn().mockImplementation(() => makeCollection()),
};

// Mutable col references — tests reassign individual entries
const mockCol: Record<string, ReturnType<typeof makeCollection>> = {
  users:           makeCollection(),
  jobs:            makeCollection(),
  tools:           makeCollection(),
  transactions:    makeCollection(),
  reviews:         makeCollection(),
  conversations:   makeCollection(),
  notifications:   makeCollection(),
  connections:     makeCollection(),
  jobApplications: makeCollection(),
  bookmarks:       makeCollection(),
  disciplines:     makeCollection(),
  specialties:     makeCollection(),
  equipment:       makeCollection(),
  certifications:  makeCollection(),
  callLogs:        makeCollection(),
  smsLogs:         makeCollection(),
  abuseReports:    makeCollection(),
  subscriptions:   makeCollection(),
  adminLogs:       makeCollection(),
};

jest.mock('../config/firebase', () => ({
  __esModule: true,
  db: mockDb,
  authAdmin: mockAuthAdmin,
  fcm: mockFcm,
  storage: {},
  col: mockCol,
  default: {},
}));

// ── Import app after all mocks ────────────────────────────────────────────────

import supertest from 'supertest';
import app from '../app';

const request = supertest(app);

function asAdmin() {
  return { Authorization: 'Bearer fake-admin-token' };
}

// Reset all col mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockCol).forEach((key) => {
    Object.assign(mockCol[key], makeCollection());
  });
  // Wire db.collection to return an empty chainable by default
  mockDb.collection.mockImplementation(() => makeCollection());
  mockFcm.sendToTopic.mockResolvedValue('msg-id');
  mockAuthAdmin.revokeRefreshTokens.mockResolvedValue(undefined);
  mockAuthAdmin.setCustomUserClaims.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/metrics', () => {
  it('returns system metrics with uptime and memory', async () => {
    const res = await request.get('/api/admin/metrics').set(asAdmin());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.memory.heapUsedMb).toBe('number');
    expect(res.body.data.nodeVersion).toMatch(/^v\d+/);
  });
});

describe('GET /api/admin/stats', () => {
  it('returns aggregate platform stats', async () => {
    const ten = makeCollection(Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      data: { amount: 100, status: 'completed' },
    })));
    Object.assign(mockCol.users, ten);
    Object.assign(mockCol.jobs, ten);
    Object.assign(mockCol.tools, ten);
    Object.assign(mockCol.transactions, ten);

    const res = await request.get('/api/admin/stats').set(asAdmin());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalJobs');
    expect(res.body.data).toHaveProperty('revenue30d');
  });
});

describe('GET /api/admin/users', () => {
  it('returns paginated user list', async () => {
    Object.assign(mockCol.users, makeCollection([
      { id: 'u1', data: { displayName: 'Alice', email: 'alice@test.com', role: 'client', verificationStatus: 'unverified', banned: false, createdAt: null } },
      { id: 'u2', data: { displayName: 'Bob', email: 'bob@test.com', role: 'professional', verificationStatus: 'identity_verified', banned: false, createdAt: null } },
    ]));

    const res = await request.get('/api/admin/users').set(asAdmin());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('limit');
  });

  it('filters by role query param', async () => {
    const res = await request.get('/api/admin/users?role=admin').set(asAdmin());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/users/:id/ban', () => {
  it('bans a user and revokes their sessions', async () => {
    const userRef = makeDocRef({
      uid: 'target-uid',
      displayName: 'SpamUser',
      email: 'spam@test.com',
    }, 'target-uid');

    mockCol.users.doc.mockReturnValue(userRef);

    const res = await request
      .post('/api/admin/users/target-uid/ban')
      .set(asAdmin())
      .send({ reason: 'Spam' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(userRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ banned: true, bannedReason: 'Spam' }),
    );
    expect(mockAuthAdmin.revokeRefreshTokens).toHaveBeenCalledWith('target-uid');
  });

  it('returns 404 when user not found', async () => {
    mockCol.users.doc.mockReturnValue(makeDocRef(null));

    const res = await request
      .post('/api/admin/users/nonexistent/ban')
      .set(asAdmin())
      .send({ reason: 'test' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/users/:id/unban', () => {
  it('unbans a user', async () => {
    const userRef = makeDocRef({ uid: 'u1', banned: true }, 'u1');
    mockCol.users.doc.mockReturnValue(userRef);

    const res = await request
      .post('/api/admin/users/u1/unban')
      .set(asAdmin());

    expect(res.status).toBe(200);
    expect(userRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ banned: false }),
    );
  });
});

describe('POST /api/admin/users/:id/verify', () => {
  it('sets verification status to identity_verified', async () => {
    const userRef = makeDocRef({ uid: 'u1' }, 'u1');
    mockCol.users.doc.mockReturnValue(userRef);

    const res = await request
      .post('/api/admin/users/u1/verify')
      .set(asAdmin())
      .send({ level: 'identity_verified' });

    expect(res.status).toBe(200);
    expect(userRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: 'identity_verified', idVerified: true }),
    );
  });

  it('rejects invalid verification level', async () => {
    const res = await request
      .post('/api/admin/users/u1/verify')
      .set(asAdmin())
      .send({ level: 'super_verified' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/jobs', () => {
  it('returns paginated jobs list', async () => {
    Object.assign(mockCol.jobs, makeCollection([
      { id: 'j1', data: { title: 'Survey Job', status: 'posted', listingType: 'hiring', isFeatured: false } },
    ]));

    const res = await request.get('/api/admin/jobs').set(asAdmin());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PATCH /api/admin/jobs/:id/feature', () => {
  it('features a job', async () => {
    const jobRef = makeDocRef({ title: 'Test Job', status: 'posted' }, 'j1');
    mockCol.jobs.doc.mockReturnValue(jobRef);

    const res = await request
      .patch('/api/admin/jobs/j1/feature')
      .set(asAdmin())
      .send({ featured: true });

    expect(res.status).toBe(200);
    expect(jobRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isFeatured: true }),
    );
  });
});

describe('DELETE /api/admin/jobs/:id', () => {
  it('archives (soft-deletes) a job', async () => {
    const jobRef = makeDocRef({ title: 'Spam Job' }, 'j1');
    mockCol.jobs.doc.mockReturnValue(jobRef);

    const res = await request.delete('/api/admin/jobs/j1').set(asAdmin());
    expect(res.status).toBe(200);
    expect(jobRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived', adminRemoved: true }),
    );
  });
});

describe('GET /api/admin/transactions', () => {
  it('returns transaction list', async () => {
    Object.assign(mockCol.transactions, makeCollection([
      { id: 'tx1', data: { amount: 500, status: 'completed', currency: 'KES', createdAt: null } },
    ]));

    const res = await request.get('/api/admin/transactions').set(asAdmin());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/admin/notifications/broadcast', () => {
  it('rejects empty payload', async () => {
    const res = await request
      .post('/api/admin/notifications/broadcast')
      .set(asAdmin())
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects title over 100 chars', async () => {
    const res = await request
      .post('/api/admin/notifications/broadcast')
      .set(asAdmin())
      .send({ title: 'x'.repeat(101), body: 'test' });
    expect(res.status).toBe(400);
  });

  it('sends FCM broadcast for valid payload', async () => {
    const res = await request
      .post('/api/admin/notifications/broadcast')
      .set(asAdmin())
      .send({ title: 'Platform Update', body: 'New features are live!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockFcm.sendToTopic).toHaveBeenCalled();
  });
});

describe('GET /api/admin/audit-logs', () => {
  it('returns audit log entries', async () => {
    const logsCollection = makeCollection([
      { id: 'log1', data: { adminId: 'admin-uid-001', action: 'user.ban', targetId: 'u2', targetType: 'user', metadata: {}, timestamp: null } },
    ]);
    // getAuditLogs uses db.collection('admin_logs') directly
    mockDb.collection.mockReturnValue(logsCollection);

    const res = await request.get('/api/admin/audit-logs').set(asAdmin());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
