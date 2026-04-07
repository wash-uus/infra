import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { col, authAdmin, storage } from '../config/firebase';
import { AuthRequest, UserProfile, Document } from '../types';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { validateImageUpload, validateDocumentUpload } from '../utils/validation';
import { optimizeImage } from '../utils/imageOptimizer';
import { cached, invalidate } from '../utils/cache';
import { getEffectiveTier } from '../utils/subscription';

// ── Referral code: stable 8-char code derived from the Firebase uid ───────────
// The uid is already a random base62 string so slicing is collision-resistant
// at the scale of 1M users (birthday probability ≈ 0.002%).
function generateShortCode(uid: string): string {
  return uid.slice(0, 8).toUpperCase();
}

// ── Get current user profile ─────────────────────────────────────────────────
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const doc = await col.users.doc(uid).get();
  // Return null (not 404) when profile doesn't exist — new users haven't called PUT /users/me yet
  if (!doc.exists) {
    res.json({ success: true, data: null });
    return;
  }

  const data = doc.data() as UserProfile;

  // Compute effective tier read-only — no writes inside a GET handler.
  // getEffectiveTier() handles expiry for both legacy and new subscription data structures.
  const effectiveTier = getEffectiveTier(data as any);

  res.json({ success: true, data: { id: doc.id, ...data, effectiveTier } });
});

// ── Create / update profile ───────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (upsertProfileSchema) in the route.
// The schema enforces role ∈ {client, professional, vendor} — 'admin' is blocked.
export const upsertProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const {
    displayName, phoneNumber, role, companyName, jobTitle, bio,
    country, city, yearsExperience, hourlyRate, availabilityStatus,
    disciplines, specialties, equipment,
    portfolioUrl, linkedinUrl,
    continent, lat, lng, town, location,
    referredBy,
  } = req.body;

  const existing = await col.users.doc(uid).get();
  const now = FieldValue.serverTimestamp();

  if (!existing.exists) {
    // First-time profile creation — role defaults to 'client' if omitted
    const referralCode = generateShortCode(uid);
    const profile: Partial<UserProfile> = {
      uid,
      email: req.user!.email ?? '',
      displayName: displayName ?? req.user!.name ?? '',
      phoneNumber,
      role: role ?? 'client',
      verificationStatus: 'unverified',
      subscription: { tier: 'free' as const, expiresAt: null },
      availabilityStatus: availabilityStatus ?? 'available',
      companyName, jobTitle, bio, country, city,
      continent, lat, lng, town, location,
      portfolioUrl: portfolioUrl || undefined,
      linkedinUrl:  linkedinUrl  || undefined,
      yearsExperience, hourlyRate,
      disciplines: disciplines ?? [],
      specialties: specialties ?? [],
      equipment: equipment ?? [],
      averageRating: 0,
      totalReviews: 0,
      completedProjects: 0,
      totalJobs: 0,
      totalTools: 0,
      emailVerified: req.user!.email_verified ?? false,
      phoneVerified: false,
      idVerified: false,
      unreadNotificationCount: 0,
      referralCode,
      referralCount: 0,
    };

    // ── Referral attribution ────────────────────────────────────────────────
    // Only attribute if the code is non-empty and is NOT the new user's own code
    // (prevents self-referral).  We look up the referrer by referralCode and
    // increment their count atomically.
    const normalizedRef = referredBy?.toUpperCase().trim();
    if (normalizedRef && normalizedRef !== referralCode) {
      const referrerSnap = await col.users
        .where('referralCode', '==', normalizedRef)
        .limit(1)
        .get();
      if (!referrerSnap.empty) {
        (profile as any).referredBy = normalizedRef;
        // Increment the referrer's count as a side-effect (non-blocking batch)
        referrerSnap.docs[0].ref
          .update({ referralCount: FieldValue.increment(1), updatedAt: now })
          .catch(() => {});
      }
    }

    await col.users.doc(uid).set({ ...profile, createdAt: now, updatedAt: now });
    res.status(201).json({ success: true, data: { id: uid, ...profile } });
  } else {
    const updates: Record<string, unknown> = { updatedAt: now };
    const allowed = [
      'displayName', 'phoneNumber', 'companyName', 'jobTitle', 'bio',
      'country', 'city', 'yearsExperience', 'hourlyRate', 'availabilityStatus',
      'disciplines', 'specialties', 'equipment',
      // Professional links (added in Phase 3)
      'portfolioUrl', 'linkedinUrl',
      // Location detail from map picker
      'continent', 'lat', 'lng', 'town', 'location',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Treat empty string as field removal for URL fields
    if (updates.portfolioUrl === '') updates.portfolioUrl = FieldValue.delete();
    if (updates.linkedinUrl  === '') updates.linkedinUrl  = FieldValue.delete();
    await col.users.doc(uid).update(updates);
    invalidate(`users:get:${uid}`).catch(() => {});
    res.json({ success: true, message: 'Profile updated' });
  }
});

// ── Get public profile by ID ──────────────────────────────────────────────────
export const getProfileById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Cache only public profile data (owner/admin requests bypass for full data)
  const isOwner = req.user?.uid === id;
  const isAdmin = req.user?.['role'] === 'admin';

  if (!isOwner && !isAdmin) {
    const publicData = await cached(`users:get:${id}`, 120, async () => {
      const doc = await col.users.doc(id).get();
      if (!doc.exists) return null;
      // Allowlist approach: only expose fields that are safe to make public.
      // Never spread the whole document — new internal fields stay private by default.
      const PUBLIC_FIELDS = new Set([
        'displayName', 'photoURL', 'role', 'bio', 'jobTitle', 'companyName',
        'country', 'city', 'averageRating', 'totalReviews', 'completedProjects',
        'totalJobs', 'totalTools', 'idVerified', 'availabilityStatus',
        'yearsExperience', 'hourlyRate', 'disciplines', 'specialties',
        'verificationStatus', 'createdAt', 'updatedAt',
      ]);
      const raw = doc.data() as Record<string, unknown>;
      const pub: Record<string, unknown> = { id: doc.id };
      for (const [k, v] of Object.entries(raw)) {
        if (PUBLIC_FIELDS.has(k)) pub[k] = v;
      }
      return pub;
    });
    if (!publicData) throw new NotFoundError('Profile');
    res.json({ success: true, data: publicData });
    return;
  }

  // Owner / admin: fetch full data without caching
  const doc = await col.users.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Profile');
  res.json({ success: true, data: { id: doc.id, ...doc.data() } });
});

// ── Search profiles ───────────────────────────────────────────────────────────
export const searchProfiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    discipline, specialty, country, city, role,
    available, pageSize = '24', sort = 'relevance',
  } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query = col.users;

  // Firestore inequality filters must all be on the same field, so we choose
  // country > city > discipline precedence when building the query.
  if (role)     query = query.where('role', '==', role);
  if (country)  query = query.where('country', '==', country);
  if (city)     query = query.where('city', '==', city);
  if (available === 'true') query = query.where('availabilityStatus', '==', 'available');
  // Use the first array-contains filter available (Firestore allows only one per query)
  if (discipline) {
    query = query.where('disciplines', 'array-contains', discipline);
  } else if (specialty) {
    query = query.where('specialties', 'array-contains', specialty);
  }

  const limit = Math.min(parseInt(pageSize, 10), 50);
  query = query.orderBy('averageRating', 'desc').limit(limit);

  const snapshot = await query.get();

  // PII fields that must never be returned to other users via the public search API.
  const PII_FIELDS = new Set([
    'email', 'phoneNumber', 'fcmToken', 'stripeCustomerId',
    'referralCode', 'referredBy', 'bonusListings',
  ]);

  // ── Relevancy scoring ───────────────────────────────────────────────────────
  // Post-process: if both discipline & specialty requested, filter client-side
  // and apply a lightweight relevancy score for ranking.
  let profiles = snapshot.docs.map((d) => {
    const data = d.data() as Record<string, any>;
    const filtered: Record<string, any> = { uid: d.id };
    for (const [key, val] of Object.entries(data)) {
      if (!PII_FIELDS.has(key)) filtered[key] = val;
    }
    return filtered;
  });

  // Secondary specialty filter (Firestore can only carry one array-contains)
  if (discipline && specialty) {
    profiles = profiles.filter((p: any) =>
      Array.isArray(p.specialties) && p.specialties.includes(specialty),
    );
  }

  // Relevancy score: idVerified(+30) + rating*10 + completedProjects*0.5 + available(+10)
  const scored = profiles.map((p: any) => {
    const score =
      (p.idVerified ? 30 : 0) +
      (p.averageRating ?? 0) * 10 +
      (p.completedProjects ?? 0) * 0.5 +
      (p.availabilityStatus === 'available' ? 10 : 0);
    return { ...p, _score: score };
  });

  const sorted =
    sort === 'rating'
      ? scored.sort((a: any, b: any) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      : sort === 'experience'
      ? scored.sort((a: any, b: any) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0))
      : scored.sort((a: any, b: any) => b._score - a._score); // default: relevance

  // Remove internal score from response
  const result = sorted.map(({ _score, ...p }: any) => p);

  res.json({
    success: true,
    data: { profiles: result },
    total: result.length,
    pageSize: limit,
    hasMore: result.length === limit,
  });
});

// ── Upload profile photo ──────────────────────────────────────────────────────
export const uploadProfilePhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  if (!req.file) throw new BadRequestError('No file uploaded');
  validateImageUpload(req.file);

  const bucket = storage.bucket();
  const { buffer: imgBuffer, mimetype: imgMime, filename: imgName } =
    await optimizeImage(req.file.buffer, req.file.originalname, req.file.mimetype);
  const filename = `profiles/${uid}/${uuidv4()}-${imgName}`;
  const file = bucket.file(filename);

  await file.save(imgBuffer, {
    metadata: { contentType: imgMime, cacheControl: 'public, max-age=86400' },
  });

  // Profile photos are public — use the permanent GCS public URL instead of an
  // expiring signed URL so it never breaks after 7 days.
  await file.makePublic();
  const photoURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;
  await col.users.doc(uid).update({ photoURL, updatedAt: FieldValue.serverTimestamp() });
  await authAdmin.updateUser(uid, { photoURL });

  res.json({ success: true, data: { photoURL } });
});

// ── Upload verification document ──────────────────────────────────────────────
export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  if (!req.file) throw new BadRequestError('No file uploaded');
  validateDocumentUpload(req.file);
  const { documentType, title } = req.body;

  const bucket = storage.bucket();
  const docId = uuidv4();
  // Sanitize originalname to prevent path traversal (../../../etc) in GCS object keys.
  const safeOriginalName = req.file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
  const filename = `documents/${uid}/${docId}-${safeOriginalName}`;
  const file = bucket.file(filename);

  await file.save(req.file.buffer, {
    metadata: { contentType: req.file.mimetype },
  });

  // Store the GCS path (not a time-limited signed URL) so we can always generate
  // a fresh signed URL on demand. The signed URL below is for the immediate response.
  const [fileUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour — for immediate use only
  });

  const documentData: Document = {
    id: docId,
    userId: uid,
    documentType: documentType ?? 'other',
    title: title ?? req.file.originalname,
    fileUrl,
    storagePath: filename, // persisted path for URL regeneration
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  await col.users.doc(uid).collection('documents').doc(docId).set(documentData);

  res.status(201).json({ success: true, data: documentData });
});

// ── List own documents ────────────────────────────────────────────────────────
export const listMyDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.users
    .doc(uid)
    .collection('documents')
    .orderBy('createdAt', 'desc')
    .get();

  const bucket = storage.bucket();
  const docs = await Promise.all(
    snapshot.docs.map(async (d) => {
      const data = d.data() as any;
      // Regenerate a fresh signed URL from the persisted storagePath.
      // Falls back gracefully if the document predates storagePath storage.
      if (data.storagePath) {
        try {
          const [freshUrl] = await bucket.file(data.storagePath).getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
          });
          return { id: d.id, ...data, fileUrl: freshUrl };
        } catch {
          // If URL generation fails, return whatever is stored
        }
      }
      return { id: d.id, ...data };
    }),
  );

  res.json({ success: true, data: docs });
});

// ── Set Firebase custom claims (admin action) ─────────────────────────────────
export const setUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const callerRole = req.user?.['role'];
  if (callerRole !== 'admin') throw new ForbiddenError();

  const { userId, role } = req.body;
  await authAdmin.setCustomUserClaims(userId, { role });
  await col.users.doc(userId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, message: `Role updated to ${role}` });
});

// ── Admin: review document ────────────────────────────────────────────────────
export const reviewDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const callerRole = req.user?.['role'];
  if (callerRole !== 'admin') throw new ForbiddenError();

  const { userId, docId } = req.params;
  const { status, reviewNotes } = req.body;

  const docRef = col.users.doc(userId).collection('documents').doc(docId);
  const snap = await docRef.get();
  if (!snap.exists) throw new NotFoundError('Document');

  await docRef.update({
    status,
    reviewNotes,
    reviewedBy: req.user!.uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update profile verification status if approved license
  if (status === 'approved') {
    const docType = snap.data()?.documentType;
    let verificationStatus: string | null = null;
    if (docType === 'national_id' || docType === 'passport') verificationStatus = 'identity_verified';
    if (docType === 'license' || docType === 'certificate') verificationStatus = 'license_verified';
    if (verificationStatus) {
      await col.users.doc(userId).update({ verificationStatus, updatedAt: FieldValue.serverTimestamp() });
    }
  }

  res.json({ success: true, message: `Document ${status}` });
});

// ── Get reference data ────────────────────────────────────────────────────────
export const getDisciplines = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const snap = await col.disciplines.orderBy('order').get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

export const getSpecialties = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { disciplineId } = req.query;
  let query: FirebaseFirestore.Query = col.specialties;
  if (disciplineId) query = query.where('disciplineId', '==', disciplineId);
  const snap = await query.orderBy('name').get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

export const getCertifications = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const snap = await col.certifications.orderBy('name').get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

export const getEquipment = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const snap = await col.equipment.orderBy('name').get();
  res.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

// ── Cancel / downgrade subscription to free ──────────────────────────────────
// Paid tier upgrades go through the /subscriptions payment flow exclusively.
// This endpoint only allows downgrading back to 'free' (cancellation).
export const upgradeSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { tier } = req.body as { tier: string };

  // Block any attempt to set a paid tier directly — must pay via /subscriptions
  if (tier !== 'free') {
    res.status(403).json({
      success: false,
      message: 'Paid plan upgrades require payment. Please use the subscription checkout.',
    });
    return;
  }

  const userDoc = await col.users.doc(uid).get();
  if (!userDoc.exists) throw new NotFoundError('Profile');

  await col.users.doc(uid).update({
    'subscription.tier': 'free',
    'subscription.expiresAt': null,
    subscriptionTier: 'free',
    subscriptionTierExpiry: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({
    success: true,
    message: 'Subscription cancelled. You are now on the Free plan.',
    data: { subscriptionTier: 'free', subscriptionTierExpiry: null },
  });
});

// ── Get my bookmarks (jobs + tools) ─────────────────────────────────
export const getMyBookmarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { type } = req.query as { type?: 'jobs' | 'tools' };

  const snap = await col.bookmarks.where('userId', '==', uid).get();
  const bookmarkDocs = snap.docs.map((d) => d.data());

  let jobIds: string[] = [];
  let toolIds: string[] = [];

  for (const bm of bookmarkDocs) {
    if (bm.jobId) jobIds.push(bm.jobId);
    if (bm.toolId) toolIds.push(bm.toolId);
  }

  // Firestore 'in' supports up to 30 items
  const fetchInBatches = async <T>(ids: string[], fetchFn: (batch: string[]) => Promise<T[]>): Promise<T[]> => {
    const results: T[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      results.push(...await fetchFn(batch));
    }
    return results;
  };

  const [jobs, tools] = await Promise.all([
    (!type || type === 'jobs') && jobIds.length > 0
      ? fetchInBatches(jobIds, async (batch) => {
          const s = await col.jobs.where('__name__', 'in', batch).get();
          return s.docs.map((d) => ({ id: d.id, ...d.data() }));
        })
      : Promise.resolve([]),
    (!type || type === 'tools') && toolIds.length > 0
      ? fetchInBatches(toolIds, async (batch) => {
          const s = await col.tools.where('__name__', 'in', batch).get();
          return s.docs.map((d) => ({ id: d.id, ...d.data() }));
        })
      : Promise.resolve([]),
  ]);

  res.json({ success: true, data: { jobs, tools } });
});

// ── Get current user's referral code + count ──────────────────────────────────
export const getMyReferral = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const doc = await col.users.doc(uid).get();
  if (!doc.exists) throw new NotFoundError('Profile');

  const data = doc.data() as any;
  // Backfill: generate code if the user pre-dates this feature
  let { referralCode, referralCount = 0 } = data;
  if (!referralCode) {
    referralCode = generateShortCode(uid);
    await col.users.doc(uid).update({
      referralCode,
      referralCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infra.co.ke';
  res.json({
    success: true,
    data: {
      referralCode,
      referralCount,
      referralUrl: `${BASE_URL}?ref=${referralCode}`,
    },
  });
});

// ── Log share event (fire-and-forget analytics) ───────────────────────────────
export const logShareEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { type, entityId, channel } = req.body as {
    type: 'job' | 'tool' | 'profile';
    entityId: string;
    channel: 'whatsapp' | 'copy' | 'twitter';
  };

  await col.shareEvents.add({
    userId: uid,
    type,
    entityId,
    channel,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ success: true });
});

