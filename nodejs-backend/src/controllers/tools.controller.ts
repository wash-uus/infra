import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { col, storage, db } from '../config/firebase';
import { AuthRequest, Tool } from '../types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { validateImageUpload } from '../utils/validation';
import { optimizeImage } from '../utils/imageOptimizer';
import { cached, invalidate, invalidatePattern } from '../utils/cache';
import { TIER_LIMITS, getEffectiveTier, TIER_FREE_FEATURES, TIER_SCORE_WEIGHTS } from '../utils/subscription';

// Shared helper — wraps GCS errors with a human-readable message
async function saveToStorage(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  try {
    const bucket = storage.bucket(env.FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(filename);
    await file.save(buffer, { metadata: { contentType: mimetype } });
    // Public URL — requires the GCS bucket to have uniform public access enabled.
    // Signed URLs expire after 7 days causing broken images for older listings.
    // To enable public access: `gsutil iam ch allUsers:objectViewer gs://${BUCKET}`
    return `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${filename}`;
  } catch (err: any) {
    if (err?.code === 404 || err?.message?.includes('does not exist')) {
      throw new Error(
        'Firebase Storage bucket not found. Please enable Storage in the Firebase Console ' +
        '(Build → Storage → Get started) and try again.',
      );
    }
    throw err;
  }
}

// ── List tools ────────────────────────────────────────────────────────────────
export const listTools = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    listingType, category, country, available,
    featured, cursor, pageSize = '20',
  } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query = col.tools;

  if (listingType) query = query.where('listingType', '==', listingType);
  if (category) query = query.where('category', '==', category);
  if (country) query = query.where('country', '==', country);
  if (available === 'true') query = query.where('isAvailable', '==', true);
  if (featured === 'true') query = query.where('isFeatured', '==', true);

  const limit = Math.min(parseInt(pageSize, 10), 50);
  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (cursor) {
    const cursorDoc = await col.tools.doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const cacheKey = `tools:list:${JSON.stringify({ listingType, category, country, available, featured, cursor, pageSize })}`;
  const result = await cached(cacheKey, 60, async () => {
    const snapshot = await query.get();
    const now = Date.now();
    const tools = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, any>))
      .map((t) => {
        if (t.isFeatured && t.featuredExpiresAt) {
          const expiryMs = typeof t.featuredExpiresAt.toMillis === 'function'
            ? t.featuredExpiresAt.toMillis()
            : (t.featuredExpiresAt._seconds ?? 0) * 1000;
          if (expiryMs < now) t.isFeatured = false;
        }
        return t;
      });
    tools.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if ((b.boostScore ?? 0) !== (a.boostScore ?? 0)) return (b.boostScore ?? 0) - (a.boostScore ?? 0);
      return 0;
    });
    return { data: tools, hasMore: tools.length === limit, nextCursor: tools.length === limit ? tools[tools.length - 1]?.id : undefined };
  });

  // Public CDN caching — no auth header means it's safe to cache at the edge
  if (!req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  }
  res.json({ success: true, ...result });
});
export const getTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const toolData = await cached(`tools:get:${id}`, 120, async () => {
    const doc = await col.tools.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Record<string, unknown>;
  });
  if (!toolData) throw new NotFoundError('Tool');
  col.tools.doc(id).update({ viewsCount: FieldValue.increment(1) }).catch(() => {});
  res.json({ success: true, data: toolData });
});

// ── Create tool ────────────────────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (createToolSchema) in the route.
export const createTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  const userData = userDoc.data();

  // Enforce subscription posting limits using the canonical SSoT.
  const tier = getEffectiveTier(userData ?? {});
  const limit = TIER_LIMITS[tier] ?? 2;
  if (isFinite(limit)) {
    const activeTools = await col.tools
      .where('ownerId', '==', uid)
      .where('isAvailable', '==', true)
      .get();
    if (activeTools.size >= limit) {
      col.conversionEvents.add({
        type: 'limit_hit',
        context: 'tool_create',
        userId: uid,
        currentTier: tier,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
      res.status(403).json({
        success: false,
        code: 'LIMIT_HIT',
        message: `You've reached your free limit of ${limit} active equipment listing${limit !== 1 ? 's' : ''}. Upgrade to list unlimited tools.`,
      });
      return;
    }
  }

  const toolId = uuidv4();
  const now = FieldValue.serverTimestamp();

  const tool: Omit<Tool, 'id'> = {
    listingType: req.body.listingType ?? 'renting',
    title: req.body.title,
    description: req.body.description,
    category: req.body.category ?? 'other',
    location: req.body.location ?? '',
    country: req.body.country,
    price: req.body.price,
    dailyRate: req.body.dailyRate,
    currency: req.body.currency ?? 'KES',
    images: req.body.images ?? [],
    ownerId: uid,
    ownerName: userData?.displayName ?? '',
    ownerPhoto: userData?.photoURL,
    isAvailable: true,
    isFeatured: false,
    featuredExpiresAt: null as any,
    boostScore: TIER_SCORE_WEIGHTS[tier] ?? 0,
    ownerTier: tier,
    isVerified: false,
    condition: req.body.condition,
    viewsCount: 0,
    bookmarksCount: 0,
    createdAt: now as any,
    updatedAt: now as any,
  };

  await col.tools.doc(toolId).set(tool);
  await col.users.doc(uid).update({ totalTools: FieldValue.increment(1) });
  invalidatePattern('tools:list:*').catch(() => {});

  res.status(201).json({ success: true, data: { id: toolId, ...tool } });
});

// ── Update tool ───────────────────────────────────────────────────────────────
export const updateTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.tools.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Tool');

  const tool = doc.data() as Tool;
  if (tool.ownerId !== uid && req.user?.['role'] !== 'admin') throw new ForbiddenError();

  const allowed = [
    'title', 'description', 'category', 'location', 'country',
    'price', 'dailyRate', 'currency', 'isAvailable', 'condition',
  ];
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await col.tools.doc(id).update(updates);
  await Promise.all([invalidate(`tools:get:${id}`), invalidatePattern('tools:list:*')]);
  res.json({ success: true, message: 'Tool updated' });
});

// ── Delete tool ───────────────────────────────────────────────────────────────
export const deleteTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.tools.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Tool');

  const tool = doc.data() as Tool;
  if (tool.ownerId !== uid && req.user?.['role'] !== 'admin') throw new ForbiddenError();

  await col.tools.doc(id).delete();
  await col.users.doc(uid).update({ totalTools: FieldValue.increment(-1) });
  await Promise.all([invalidate(`tools:get:${id}`), invalidatePattern('tools:list:*')]);

  res.json({ success: true, message: 'Tool deleted' });
});

// ── Upload tool image ─────────────────────────────────────────────────────────
export const uploadToolImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  if (!req.file) throw new BadRequestError('No file uploaded');
  validateImageUpload(req.file);

  const doc = await col.tools.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Tool');
  const tool = doc.data() as Tool;
  if (tool.ownerId !== uid) throw new ForbiddenError();

  const bucket = storage.bucket(env.FIREBASE_STORAGE_BUCKET);
  const { buffer: imgBuffer, mimetype: imgMime, filename: imgName } =
    await optimizeImage(req.file.buffer, req.file.originalname, req.file.mimetype);
  const filename = `tools/${id}/${uid}-${uuidv4()}-${imgName}`;
  const file = bucket.file(filename);

  await file.save(imgBuffer, {
    metadata: { contentType: imgMime },
  });
  // Public URL (same reason as saveToStorage helper above — no 7-day expiry)
  const imageUrl = `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${filename}`;
  const newImage = { url: imageUrl, caption: req.body.caption, order: tool.images.length };

  await col.tools.doc(id).update({
    images: FieldValue.arrayUnion(newImage),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: newImage });
});

// ── Toggle tool bookmark ──────────────────────────────────────────────────────
export const toggleBookmark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const existing = await col.bookmarks
    .where('userId', '==', uid)
    .where('toolId', '==', id)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.delete();
    await col.tools.doc(id).update({ bookmarksCount: FieldValue.increment(-1) });
    invalidate(`tools:get:${id}`).catch(() => {});
    res.json({ success: true, bookmarked: false });
    return;
  }

  const bmId = uuidv4();
  await col.bookmarks.doc(bmId).set({
    id: bmId,
    userId: uid,
    toolId: id,
    createdAt: FieldValue.serverTimestamp(),
  });
  await col.tools.doc(id).update({ bookmarksCount: FieldValue.increment(1) });
  invalidate(`tools:get:${id}`).catch(() => {});
  res.json({ success: true, bookmarked: true });
});

// ── Feature a tool listing ────────────────────────────────────────────────────
// Same credit logic as featureJob — Pro gets 1/month, Elite gets 5/month.
export const featureTool = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const [toolDoc, userDoc] = await Promise.all([
    col.tools.doc(id).get(),
    col.users.doc(uid).get(),
  ]);

  if (!toolDoc.exists) throw new NotFoundError('Tool');
  const tool = toolDoc.data() as Tool;
  if (tool.ownerId !== uid) throw new ForbiddenError();

  const userData = userDoc.data() ?? {};
  const tier = getEffectiveTier(userData);
  const freeCredits = TIER_FREE_FEATURES[tier] ?? 0;

  if (freeCredits === 0) {
    res.status(403).json({
      success: false,
      code: 'UPGRADE_REQUIRED',
      message: 'Featured listings require a Pro or Elite plan. Upgrade to feature your listings.',
    });
    return;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const creditsUsed: number = (userData as any).featuredCreditsUsed?.[monthKey] ?? 0;

  if (creditsUsed >= freeCredits) {
    res.status(403).json({
      success: false,
      code: 'CREDITS_EXHAUSTED',
      message: `You have used all ${freeCredits} free featured listing credit${freeCredits !== 1 ? 's' : ''} for this month. Upgrade to Elite for more credits.`,
    });
    return;
  }

  const featuredExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const batch = db.batch();
  batch.update(col.tools.doc(id), {
    isFeatured: true,
    featuredExpiresAt: Timestamp.fromDate(featuredExpiresAt),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(col.users.doc(uid), {
    [`featuredCreditsUsed.${monthKey}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await Promise.all([invalidate(`tools:get:${id}`), invalidatePattern('tools:list:*')]);

  res.json({
    success: true,
    message: 'Tool listing featured for 7 days.',
    featuredExpiresAt: featuredExpiresAt.toISOString(),
    creditsRemaining: freeCredits - creditsUsed - 1,
  });
});
