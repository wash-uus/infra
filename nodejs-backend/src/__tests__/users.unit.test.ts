/**
 * Users Controller Unit Tests
 *
 * Tests: getMe, upsertProfile, getProfileById
 *
 * Strategy: mock `../config/firebase` directly so `col.*` references in the
 * controller use test-controlled Firestore chain mocks — no real Firebase.
 */

// ── Module mocks (hoisted before imports) ─────────────────────────────────────

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

jest.mock('../utils/cache', () => ({
  cached:          jest.fn((key: string, _ttl: number, fn: () => unknown) => fn()),
  invalidate:      jest.fn().mockResolvedValue(undefined),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/imageOptimizer', () => ({
  optimizeImage: jest.fn(),
}));

jest.mock('../utils/auditLog', () => ({
  logAdminAction:            jest.fn(),
  requireConfirmationHeader: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
}));

jest.mock('../utils/validation', () => ({
  // Middleware factory — pass-through so routes load and run without validation side-effects
  validate:              (_schema: unknown) =>
    (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  upsertProfileSchema:   {},
  logShareEventSchema:   {},
  saveFcmTokenSchema:    {},
  validateImageUpload:   jest.fn(),
  validateDocumentUpload: jest.fn(),
}));

jest.mock('../queues/notifications.queue', () => ({
  enqueueNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../middleware/auth', () => ({
  requireAuth:      (req: any, _res: any, next: any) => {
    req.user = { uid: 'user-uid-001', email: 'user@infrasells.com', name: 'Test User', email_verified: true };
    next();
  },
  requireAdmin:      (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
  requireModerator:  (_req: any, _res: any, next: any) => next(),
  requireRole:       () => (_req: any, _res: any, next: any) => next(),
  optionalAuth:      (req: any, _res: any, next: any) => {
    req.user = { uid: 'user-uid-001', email: 'user@infrasells.com' };
    next();
  },
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
    add: jest.fn().mockResolvedValue({ id: 'new-doc' }),
  };
}

// ── Build the col mock ────────────────────────────────────────────────────────

const mockAuthAdmin = {
  revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  setCustomUserClaims:  jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  batch: jest.fn().mockReturnValue({
    set:    jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
  collection: jest.fn().mockImplementation(() => makeCollection()),
};

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
  __esModule:  true,
  db:          mockDb,
  authAdmin:   mockAuthAdmin,
  storage:     {},
  col:         mockCol,
  default:     {},
}));

// ── Import app after all mocks ────────────────────────────────────────────────

import supertest from 'supertest';
import app from '../app';

const request = supertest(app);
const AUTH = { Authorization: 'Bearer fake-user-token' };

// Rebuild col mocks before each test so tests are isolated
beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockCol).forEach((key) => {
    Object.assign(mockCol[key], makeCollection());
  });
  mockDb.collection.mockImplementation(() => makeCollection());
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns null data when profile does not exist yet', async () => {
    // Empty collection: doc().get() returns { exists: false }
    mockCol.users.doc.mockReturnValue(makeDocRef(null, 'user-uid-001'));

    const res = await request.get('/api/users/me').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('returns user profile when it exists', async () => {
    const profileData: DocData = {
      uid: 'user-uid-001',
      displayName: 'Test User',
      email: 'user@infrasells.com',
      role: 'client',
      subscription: { tier: 'free', expiresAt: null },
      subscriptionTier: 'free',
      subscriptionTierExpiry: null,
    };
    mockCol.users.doc.mockReturnValue(makeDocRef(profileData, 'user-uid-001'));

    const res = await request.get('/api/users/me').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('user-uid-001');
    expect(res.body.data.displayName).toBe('Test User');
    expect(res.body.data.role).toBe('client');
  });

  it('returns effectiveTier=free for an expired paid subscription', async () => {
    const pastDate = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
    const profileData: DocData = {
      uid: 'user-uid-001',
      displayName: 'Pro User',
      email: 'user@infrasells.com',
      role: 'professional',
      subscription: { tier: 'pro', expiresAt: null }, // null expiresAt → treated as free by getEffectiveTier
      subscriptionTier: 'pro',
      subscriptionTierExpiry: pastDate,
    };
    const docRef = makeDocRef(profileData, 'user-uid-001');
    mockCol.users.doc.mockReturnValue(docRef);

    const res = await request.get('/api/users/me').set(AUTH);

    expect(res.status).toBe(200);
    // getMe computes effectiveTier in-memory — no Firestore write occurs
    expect(docRef.update).not.toHaveBeenCalled();
    // effectiveTier should be 'free' since subscription.expiresAt is null
    expect(res.body.data.effectiveTier).toBe('free');
  });

  it('does not downgrade active paid subscription', async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 30).toISOString(); // 30 days from now
    const profileData: DocData = {
      uid: 'user-uid-001',
      displayName: 'Elite User',
      subscriptionTier: 'elite',
      subscriptionTierExpiry: futureDate,
    };
    const docRef = makeDocRef(profileData, 'user-uid-001');
    mockCol.users.doc.mockReturnValue(docRef);

    const res = await request.get('/api/users/me').set(AUTH);

    expect(res.status).toBe(200);
    expect(docRef.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/me
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/users/me', () => {
  it('creates a new profile (201) when none exists', async () => {
    const docRef = makeDocRef(null, 'user-uid-001');
    mockCol.users.doc.mockReturnValue(docRef);

    const res = await request
      .put('/api/users/me')
      .set(AUTH)
      .send({ displayName: 'New User', role: 'client', country: 'Kenya' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('user-uid-001');
    expect(docRef.set).toHaveBeenCalledTimes(1);
    // Default role applied
    expect(docRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'client', unreadNotificationCount: 0 }),
    );
  });

  it('defaults role to client when role is omitted on creation', async () => {
    const docRef = makeDocRef(null, 'user-uid-001');
    mockCol.users.doc.mockReturnValue(docRef);

    await request.put('/api/users/me').set(AUTH).send({ displayName: 'No Role' });

    expect(docRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'client' }),
    );
  });

  it('updates existing profile (200) and only touches allowed fields', async () => {
    const existing: DocData = {
      uid: 'user-uid-001',
      displayName: 'Old Name',
      role: 'professional',
      subscription: { tier: 'free', expiresAt: null },
    };
    const docRef = makeDocRef(existing, 'user-uid-001');
    mockCol.users.doc.mockReturnValue(docRef);

    const res = await request
      .put('/api/users/me')
      .set(AUTH)
      .send({ displayName: 'New Name', bio: 'Updated bio', role: 'admin' }); // role change is ignored for updates

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(docRef.update).toHaveBeenCalledTimes(1);
    const updateArg = docRef.update.mock.calls[0][0];
    expect(updateArg).toHaveProperty('displayName', 'New Name');
    expect(updateArg).toHaveProperty('bio', 'Updated bio');
    // role is not in the allowed keys list for updates
    expect(updateArg).not.toHaveProperty('role');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id (public profile)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users/profile/:id', () => {
  it('returns 404 when profile does not exist', async () => {
    mockCol.users.doc.mockReturnValue(makeDocRef(null, 'unknown-uid'));

    const res = await request.get('/api/users/profile/unknown-uid').set(AUTH);

    expect(res.status).toBe(404);
  });

  it('returns only public fields for a different user', async () => {
    const fullProfile: DocData = {
      uid: 'other-uid',
      displayName: 'Other User',
      email: 'private@infrasells.com',         // should NOT be returned
      role: 'professional',
      bio: 'My bio',
      country: 'Kenya',
      city: 'Nairobi',
      averageRating: 4.5,
      totalReviews: 10,
      completedProjects: 5,
      totalJobs: 20,
      totalTools: 3,
      idVerified: true,
      availabilityStatus: 'available',
      verificationStatus: 'identity_verified',
      yearsExperience: 5,
      hourlyRate: 5000,
      disciplines: ['Structural Engineering'],
      specialties: ['Bridge Design'],
      createdAt: null,
      updatedAt: null,
    };
    mockCol.users.doc.mockReturnValue(makeDocRef(fullProfile, 'other-uid'));

    // The cached mock passes through to fn() directly
    const res = await request.get('/api/users/profile/other-uid').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.displayName).toBe('Other User');
    expect(res.body.data.role).toBe('professional');
    // Private fields must not leak
    expect(res.body.data.email).toBeUndefined();
  });
});
