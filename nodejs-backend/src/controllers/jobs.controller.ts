import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { col, storage, db } from '../config/firebase';
import { AuthRequest, Job, JobApplication } from '../types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { enqueueNotification } from '../queues/notifications.queue';
import { cached, invalidate, invalidatePattern } from '../utils/cache';
import { env } from '../config/env';
import { validateImageUpload } from '../utils/validation';
import { optimizeImage } from '../utils/imageOptimizer';
import { TIER_LIMITS, getEffectiveTier, TIER_FREE_FEATURES, DAILY_APPLICATION_LIMITS, TIER_SCORE_WEIGHTS, MICROTRANSACTION_PRICES, VISIBILITY_DECAY_HOURS } from '../utils/subscription';
import { initiateStkPush } from '../services/mpesa';
import { publish } from '../events/publisher';
import { Topics } from '../events/topics';
import { logger } from '../utils/logger';
import { scoreApplication } from '../utils/matchScoring';

// ── List jobs ─────────────────────────────────────────────────────────────────
export const listJobs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    listingType, category, country, location, isRemote,
    disciplineId, status = 'posted', featured,
    cursor, pageSize = '20',
  } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query = col.jobs.where('status', '==', status);

  if (listingType) query = query.where('listingType', '==', listingType);
  if (category) query = query.where('category', '==', category);
  if (country) query = query.where('country', '==', country);
  if (disciplineId) query = query.where('disciplineId', '==', disciplineId);
  if (isRemote === 'true') query = query.where('isRemote', '==', true);
  if (featured === 'true') query = query.where('isFeatured', '==', true);

  const limit = Math.min(parseInt(pageSize, 10), 50);
  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (cursor) {
    const cursorDoc = await col.jobs.doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const cacheKey = `jobs:list:${JSON.stringify({ listingType, category, country, status, disciplineId, isRemote, featured, cursor, pageSize })}`;
  const result = await cached(cacheKey, 60, async () => {
    const snapshot = await query.get();
    const now = Date.now();
    const jobs = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, any>))
      // Remove featured flag from listings whose 7-day window has expired
      .map((j) => {
        if (j.isFeatured && j.featuredExpiresAt) {
          const expiryMs = typeof j.featuredExpiresAt.toMillis === 'function'
            ? j.featuredExpiresAt.toMillis()
            : (j.featuredExpiresAt._seconds ?? 0) * 1000;
          if (expiryMs < now) j.isFeatured = false;
        }
        return j;
      });
    // Featured listings float to top; within each group sort by combined priority score desc
    jobs.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const scoreA = (a.boostScore ?? 0) + (a.tierScore ?? 0);
      const scoreB = (b.boostScore ?? 0) + (b.tierScore ?? 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return 0; // Firestore already returned createdAt desc
    });
    return { data: jobs, hasMore: jobs.length === limit, nextCursor: jobs.length === limit ? jobs[jobs.length - 1]?.id : undefined };
  });

  // Public CDN caching — safe when no auth header (unauthenticated browse)
  if (!req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  }
  res.json({ success: true, ...result });
});

// ── Get single job ────────────────────────────────────────────────────────────
export const getJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const jobData = await cached(`jobs:get:${id}`, 120, async () => {
    const doc = await col.jobs.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Record<string, unknown>;
  });
  if (!jobData) throw new NotFoundError('Job');

  // Increment view count (fire-and-forget)
  col.jobs.doc(id).update({ viewsCount: FieldValue.increment(1) }).catch(() => {});

  // Bookmark check is per-user — kept out of cache
  let isBookmarked = false;
  const uid = req.user?.uid;
  if (uid) {
    const bmId = `${uid}_${id}`;
    const bmDoc = await col.bookmarks.doc(bmId).get();
    isBookmarked = bmDoc.exists;
  }

  // Urgency metadata — only computed for the job owner, never cached
  let urgency: Record<string, unknown> | null = null;
  if (uid && jobData.postedBy === uid) {
    const ownerDoc = await col.users.doc(uid).get();
    const ownerTier = getEffectiveTier(ownerDoc.data() ?? {});

    // Compute visibility decay timestamp from updatedAt
    const updatedMs =
      typeof (jobData.updatedAt as any)?.toMillis === 'function'
        ? (jobData.updatedAt as any).toMillis()
        : Date.now();
    const visibilityDecaysAt = new Date(updatedMs + VISIBILITY_DECAY_HOURS * 60 * 60 * 1000).toISOString();

    // Count locked applicants (all unread applicants for free employers)
    let lockedApplicantsWaiting = 0;
    if (ownerTier === 'free') {
      const [allApps, unlocked] = await Promise.all([
        col.jobApplications.where('jobId', '==', id).get(),
        col.unlockedApplications.where('jobId', '==', id).where('employerId', '==', uid).get(),
      ]);
      lockedApplicantsWaiting = Math.max(0, allApps.size - unlocked.size);
    }

    urgency = {
      lockedApplicantsWaiting,
      totalApplicants: jobData.applicationsCount ?? 0,
      isContactGated: ownerTier === 'free',
      visibilityDecaysAt,
    };
  }

  res.json({ success: true, data: { ...jobData, isBookmarked }, meta: { urgency } });
});

// ── Create job ────────────────────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (createJobSchema) in the route.
export const createJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  const userData = userDoc.data();

  // Enforce subscription posting limits using the canonical SSoT.
  // getEffectiveTier() reads the nested subscription.{tier,expiresAt} fields
  // and correctly handles expiry for all payment paths (M-Pesa, PayPal, Stripe).
  const tier = getEffectiveTier(userData ?? {});
  const limit = TIER_LIMITS[tier] ?? 2;
  if (isFinite(limit)) {
    const activeJobs = await col.jobs
      .where('postedBy', '==', uid)
      .where('status', 'in', ['posted', 'accepted', 'in_progress'])
      .get();
    if (activeJobs.size >= limit) {
      // Fire-and-forget conversion event so we can track upgrade funnel
      col.conversionEvents.add({
        type: 'limit_hit',
        context: 'job_create',
        userId: uid,
        currentTier: tier,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
      res.status(403).json({
        success: false,
        code: 'LIMIT_HIT',
        message: `Your ${tier} plan allows up to ${limit} active job listing${limit !== 1 ? 's' : ''}. Upgrade your plan to post more.`,
      });
      return;
    }
  }

  const jobId = uuidv4();
  const now = FieldValue.serverTimestamp();

  const job: Omit<Job, 'id'> = {
    listingType: req.body.listingType ?? 'hiring',
    title: req.body.title,
    description: req.body.description,
    category: req.body.category ?? '',
    disciplineId: req.body.disciplineId,
    specialtyId: req.body.specialtyId,
    location: req.body.location ?? '',
    country: req.body.country,
    isRemote: req.body.isRemote ?? false,
    budget: req.body.budget,
    currency: req.body.currency ?? 'KES',
    deadline: req.body.deadline,
    postedBy: uid,
    postedByName: userData?.displayName ?? '',
    postedByPhoto: userData?.photoURL,
    status: 'posted',
    isFeatured: false,
    featuredExpiresAt: null as any,
    boostScore: 0,
    tierScore: TIER_SCORE_WEIGHTS[tier] ?? 0,
    isVerified: false,
    isAvailable: true,
    professionalId: req.body.professionalId,
    serviceType: req.body.serviceType,
    requirements: req.body.requirements ?? [],
    applicationsCount: 0,
    viewsCount: 0,
    bookmarksCount: 0,
    createdAt: now as any,
    updatedAt: now as any,
  };

  await col.jobs.doc(jobId).set(job);
  // Increment user job count
  await col.users.doc(uid).update({ totalJobs: FieldValue.increment(1) });
  // Bust list caches so new job appears immediately
  invalidatePattern('jobs:list:*').catch(() => {});

  // Fire-and-forget: publish project.created so the matching engine can run
  // asynchronously and notify professionals who match this job's criteria.
  // Using .catch() so a Pub/Sub misconfiguration never blocks the API response.
  publish(Topics.PROJECT_CREATED, {
    projectId: jobId,
    clientId:  uid,
    title:     job.title,
    budget:    typeof job.budget === 'number' ? job.budget : 0,
    currency:  job.currency ?? 'KES',
    category:  job.category ?? '',
    createdAt: new Date().toISOString(),
  }).catch((err) => {
    logger.warn('createJob: failed to publish project.created event', { jobId, error: String(err) });
  });

  res.status(201).json({ success: true, data: { id: jobId, ...job } });
});

// ── Update job ────────────────────────────────────────────────────────────────
export const updateJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.jobs.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Job');

  const job = doc.data() as Job;
  const isOwner = job.postedBy === uid;
  const isAdmin = req.user?.['role'] === 'admin';
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  const allowed = [
    'title', 'description', 'category', 'location', 'country', 'isRemote',
    'budget', 'currency', 'deadline', 'status', 'requirements',
    'professionalId', 'serviceType', 'disciplineId', 'specialtyId',
  ];
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await col.jobs.doc(id).update(updates);
  await Promise.all([invalidate(`jobs:get:${id}`), invalidatePattern('jobs:list:*')]);
  res.json({ success: true, message: 'Job updated' });
});

// ── Delete job ────────────────────────────────────────────────────────────────
export const deleteJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.jobs.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Job');

  const job = doc.data() as Job;
  const isOwner = job.postedBy === uid;
  const isAdmin = req.user?.['role'] === 'admin';
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  await col.jobs.doc(id).delete();
  await col.users.doc(uid).update({ totalJobs: FieldValue.increment(-1) });
  await Promise.all([invalidate(`jobs:get:${id}`), invalidatePattern('jobs:list:*')]);

  res.json({ success: true, message: 'Job deleted' });
});

// ── Upload job image ──────────────────────────────────────────────────────────
export const uploadJobImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  if (!req.file) throw new BadRequestError('No file uploaded');
  validateImageUpload(req.file);

  const doc = await col.jobs.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Job');
  const job = doc.data() as Job;
  if (job.postedBy !== uid) throw new ForbiddenError();

  let imageUrl: string;
  try {
    const bucket = storage.bucket(env.FIREBASE_STORAGE_BUCKET);
    const { buffer: imgBuffer, mimetype: imgMime, filename: imgName } =
      await optimizeImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    const filename = `jobs/${id}/${uid}-${uuidv4()}-${imgName}`;
    const file = bucket.file(filename);
    await file.save(imgBuffer, {
      metadata: { contentType: imgMime },
    });
    // Public URL — requires the GCS bucket to have uniform public access enabled.
    // Signed URLs generated with 7-day expiry silently break after that period;
    // public URLs are permanent and require no refresh mechanism.
    // To enable: `gsutil iam ch allUsers:objectViewer gs://${BUCKET}`
    imageUrl = `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${filename}`;
  } catch (err: any) {
    if (err?.code === 404 || err?.message?.includes('does not exist')) {
      throw new Error(
        'Firebase Storage bucket not found. Please enable Storage in the Firebase Console ' +
        '(Build → Storage → Get started) and try again.',
      );
    }
    throw err;
  }
  const currentImages = job.images ?? [];
  const newImage = { url: imageUrl, caption: req.body.caption ?? '', order: currentImages.length };

  await col.jobs.doc(id).update({
    images: FieldValue.arrayUnion(newImage),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: newImage });
});

// ── Apply to job ──────────────────────────────────────────────────────────────
export const applyToJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const [jobDoc, userDoc] = await Promise.all([
    col.jobs.doc(id).get(),
    col.users.doc(uid).get(),
  ]);

  if (!jobDoc.exists) throw new NotFoundError('Job');
  const job = jobDoc.data() as Job;
  if (job.postedBy === uid) throw new ForbiddenError('Cannot apply to your own job');

  const userData = userDoc.data();

  // Enforce daily application limits (outside transaction — quota race window is
  // at most 1 extra application, which is acceptable vs. the cost of a counter txn)
  const tier = getEffectiveTier(userData ?? {});
  const dailyLimit = DAILY_APPLICATION_LIMITS[tier] ?? 5;
  const appliedDateKey = new Date().toISOString().slice(0, 10);
  const todayApps = isFinite(dailyLimit)
    ? await col.jobApplications
        .where('applicantId', '==', uid)
        .where('appliedDateKey', '==', appliedDateKey)
        .get()
    : null;
  if (isFinite(dailyLimit) && todayApps) {
    if (todayApps.size >= dailyLimit) {
      col.conversionEvents.add({
        type: 'limit_hit',
        context: 'apply_to_job',
        userId: uid,
        currentTier: tier,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
      res.status(403).json({
        success: false,
        code: 'APPLICATION_LIMIT_HIT',
        message: `Your plan allows ${dailyLimit} application${dailyLimit === 1 ? '' : 's'} per day. Upgrade to Pro for 30/day or Elite for unlimited.`,
      });
      return;
    }
  }

  // Use a deterministic composite ID so that concurrent duplicate requests
  // converge on the same document path and the Firestore transaction's
  // existence-check closes the TOCTOU race atomically.
  const appId = `${uid}_${id}`;
  const now = FieldValue.serverTimestamp();

  const application: Omit<JobApplication, 'id'> = {
    jobId: id,
    jobTitle: job.title,
    applicantId: uid,
    applicantName: userData?.displayName ?? '',
    applicantPhoto: userData?.photoURL,
    coverLetter: req.body.coverLetter,
    proposedRate: req.body.proposedRate,
    currency: req.body.currency ?? job.currency,
    status: 'pending',
    appliedDateKey,
    createdAt: now as any,
    updatedAt: now as any,
  };

  // Atomic check-then-write: the transaction prevents two concurrent requests
  // from both passing the duplicate check before either commits.
  const alreadyApplied = await db.runTransaction(async (txn) => {
    const existingSnap = await txn.get(col.jobApplications.doc(appId));
    if (existingSnap.exists) return true;
    txn.set(col.jobApplications.doc(appId), application);
    txn.update(col.jobs.doc(id), { applicationsCount: FieldValue.increment(1) });
    return false;
  });

  if (alreadyApplied) throw new BadRequestError('You have already applied to this job');

  // Compute AI match score asynchronously — does not block the response
  scoreApplication(appId, userData ?? {}, job, db).catch((err) =>
    logger.warn('Match scoring failed for application', { appId, jobId: id, error: err?.message }),
  );

  // Remaining quota for today
  const usedAfter = (todayApps?.size ?? 0) + 1;
  const remaining = isFinite(dailyLimit) ? Math.max(0, dailyLimit - usedAfter) : null;

  // Notify job poster
  enqueueNotification(job.postedBy, {
    type: 'application',
    title: 'New Application Received',
    body: `${userData?.displayName ?? 'Someone'} applied to your job "${job.title}"`,
    recipientId: job.postedBy,
    data: { jobId: id, applicationId: appId },
  }).catch(() => {});

  res.status(201).json({ success: true, data: { id: appId, ...application }, meta: { remaining, dailyLimit: isFinite(dailyLimit) ? dailyLimit : null } });
});

// ── Get job applications ──────────────────────────────────────────────────────
export const getJobApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const jobDoc = await col.jobs.doc(id).get();
  if (!jobDoc.exists) throw new NotFoundError('Job');
  const job = jobDoc.data() as Job;
  if (job.postedBy !== uid && req.user?.['role'] !== 'admin') throw new ForbiddenError();

  const snapshot = await col.jobApplications
    .where('jobId', '==', id)
    .orderBy('createdAt', 'desc')
    .get();

  // Gate applicant contact info behind Pro tier
  const requesterDoc = await col.users.doc(uid).get();
  const requesterTier = getEffectiveTier(requesterDoc.data() ?? {});
  const canViewContact = requesterTier !== 'free';

  // For free employers: check which applicants they've individually unlocked
  let individuallyUnlocked = new Set<string>();
  if (!canViewContact) {
    const unlockedSnap = await col.unlockedApplications
      .where('jobId', '==', id)
      .where('employerId', '==', uid)
      .get();
    individuallyUnlocked = new Set(unlockedSnap.docs.map((d) => d.data().applicationId as string));
  }

  const apps = snapshot.docs.map((d, idx) => {
    const data = d.data() as JobApplication;
    const isUnlocked = canViewContact || individuallyUnlocked.has(d.id);
    if (!isUnlocked) {
      return {
        ...data,
        id: d.id,
        applicantName: `Applicant #${idx + 1}`,
        applicantPhoto: undefined,
        _locked: true,  // frontend uses this to render the unlock CTA
      };
    }
    return { ...data, id: d.id, _locked: false };
  });

  // Boosted applications float to top within each unlock-status group
  apps.sort((a, b) => {
    if (!!a.isApplicationBoosted !== !!b.isApplicationBoosted) {
      return a.isApplicationBoosted ? -1 : 1;
    }
    return (b.applicationBoostScore ?? 0) - (a.applicationBoostScore ?? 0);
  });

  const lockedCount = apps.filter((a) => (a as any)._locked).length;

  res.json({
    success: true,
    data: apps,
    meta: {
      contactGated: !canViewContact,
      lockedCount,
      unlockPriceKES: 100,
    },
  });
});

// ── Get my applications ───────────────────────────────────────────────────────
export const getMyApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.jobApplications
    .where('applicantId', '==', uid)
    .orderBy('createdAt', 'desc')
    .get();
  const apps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: apps });
});

// ── Update application status ─────────────────────────────────────────────────
export const updateApplicationStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { appId } = req.params;
  const { status } = req.body;

  const appDoc = await col.jobApplications.doc(appId).get();
  if (!appDoc.exists) throw new NotFoundError('Application');

  const app = appDoc.data() as JobApplication;

  // Owner of the job can accept/reject; applicant can withdraw
  const jobDoc = await col.jobs.doc(app.jobId).get();
  const job = jobDoc.data() as Job;

  const isJobOwner = job?.postedBy === uid;
  const isApplicant = app.applicantId === uid;

  if (!isJobOwner && !isApplicant) throw new ForbiddenError();
  if (isApplicant && status !== 'withdrawn') throw new ForbiddenError('Applicants can only withdraw');

  await col.jobApplications.doc(appId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If accepted, update job status
  if (status === 'accepted' && isJobOwner) {
    await col.jobs.doc(app.jobId).update({
      status: 'accepted',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Decrement applicationsCount when an applicant withdraws so the job's
  // displayed count stays in sync with actual active applications.
  if (status === 'withdrawn') {
    col.jobs.doc(app.jobId).update({
      applicationsCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
    // Invalidate the jobs cache so the decremented count is visible immediately.
    invalidate(`jobs:get:${app.jobId}`).catch(() => {});
  }

  // Notify applicant of status change (not on self-withdrawal)
  if (isJobOwner && app.applicantId !== uid) {
    const statusLabel = status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : status;
    enqueueNotification(app.applicantId, {
      type: 'application',
      title: `Application ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
      body: `Your application for "${app.jobTitle}" has been ${statusLabel}.`,
      recipientId: app.applicantId,
      data: { jobId: app.jobId, applicationId: appId },
    }).catch(() => {});
  }

  res.json({ success: true, message: `Application ${status}` });
});

// ── Bookmark / unbookmark job ─────────────────────────────────────────────────
export const toggleBookmark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const existing = await col.bookmarks
    .where('userId', '==', uid)
    .where('jobId', '==', id)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.delete();
    await col.jobs.doc(id).update({ bookmarksCount: FieldValue.increment(-1) });
    invalidate(`jobs:get:${id}`).catch(() => {});
    res.json({ success: true, bookmarked: false });
    return;
  }

  const bmId = uuidv4();
  await col.bookmarks.doc(bmId).set({
    id: bmId,
    userId: uid,
    jobId: id,
    createdAt: FieldValue.serverTimestamp(),
  });
  await col.jobs.doc(id).update({ bookmarksCount: FieldValue.increment(1) });
  invalidate(`jobs:get:${id}`).catch(() => {});
  res.json({ success: true, bookmarked: true });
});

// ── Feature a job listing ─────────────────────────────────────────────────────
// Pro/Elite tiers receive free monthly feature credits (TIER_FREE_FEATURES).
// Returns 403 with code UPGRADE_REQUIRED or CREDITS_EXHAUSTED when blocked.
export const featureJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const [jobDoc, userDoc] = await Promise.all([
    col.jobs.doc(id).get(),
    col.users.doc(uid).get(),
  ]);

  if (!jobDoc.exists) throw new NotFoundError('Job');
  const job = jobDoc.data() as Job;
  if (job.postedBy !== uid) throw new ForbiddenError();

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

  const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
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
  batch.update(col.jobs.doc(id), {
    isFeatured: true,
    featuredExpiresAt: Timestamp.fromDate(featuredExpiresAt),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(col.users.doc(uid), {
    [`featuredCreditsUsed.${monthKey}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await Promise.all([invalidate(`jobs:get:${id}`), invalidatePattern('jobs:list:*')]);

  res.json({
    success: true,
    message: 'Job listing featured for 7 days.',
    featuredExpiresAt: featuredExpiresAt.toISOString(),
    creditsRemaining: freeCredits - creditsUsed - 1,
  });
});

// ── Unlock individual applicant (pay-per-view) ────────────────────────────────
// POST /jobs/:id/applications/:appId/unlock
// Free employers pay KES 100 to reveal one applicant's contact info.
// Pro/Elite employers are redirected automatically (no payment required).
export const unlockApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id: jobId, appId } = req.params;
  const { phone, paymentMethod = 'mpesa' } = req.body;

  // Verify job ownership
  const jobDoc = await col.jobs.doc(jobId).get();
  if (!jobDoc.exists) throw new NotFoundError('Job');
  if ((jobDoc.data() as any).postedBy !== uid) throw new ForbiddenError();

  // Pro/Elite: no payment needed — auto-unlocked
  const userDoc = await col.users.doc(uid).get();
  const tier = getEffectiveTier(userDoc.data() ?? {});
  if (tier !== 'free') {
    res.json({ success: true, data: { status: 'unlocked', tier, paid: false } });
    return;
  }

  // Already unlocked?
  const alreadySnap = await col.unlockedApplications
    .where('employerId', '==', uid)
    .where('applicationId', '==', appId)
    .limit(1)
    .get();
  if (!alreadySnap.empty) {
    res.json({ success: true, data: { status: 'already_unlocked', paid: false } });
    return;
  }

  const appDoc = await col.jobApplications.doc(appId).get();
  if (!appDoc.exists) throw new NotFoundError('Application');

  const price = MICROTRANSACTION_PRICES.applicantUnlock;
  // Deterministic ID: concurrent requests converge on the same document instead
  // of initiating multiple STK pushes for the same unlock operation.
  const microId = `unlk_${uid}_${appId}`;

  // Idempotency: if a pending/completed microtransaction already exists, return it
  // instead of issuing a duplicate STK push.
  const existingMicro = await col.microtransactions.doc(microId).get();
  if (existingMicro.exists) {
    const em = existingMicro.data() as any;
    if (em.status !== 'failed') {
      res.json({
        success: true,
        data: {
          microtransactionId: microId,
          checkoutRequestId: em.mpesaCheckoutRequestId,
          status: em.status,
          amountKES: em.amountKES,
          label: price.label,
        },
      });
      return;
    }
  }
  const now = FieldValue.serverTimestamp();

  const micro = {
    type: 'applicant_unlock' as const,
    userId: uid,
    targetId: appId,
    targetContextId: jobId,
    amountKES: price.KES,
    amountUSD: price.USD,
    paymentMethod,
    status: 'pending' as const,
    createdAt: now,
  };
  await col.microtransactions.doc(microId).set(micro);

  if (paymentMethod === 'mpesa') {
    if (!phone) {
      res.status(400).json({ success: false, message: 'phone required for M-Pesa payment' });
      return;
    }
    const stkResult = await initiateStkPush({ amount: price.KES, phone, transactionId: microId, userId: uid });
    await col.microtransactions.doc(microId).update({ mpesaCheckoutRequestId: stkResult.CheckoutRequestID });
    res.status(202).json({
      success: true,
      data: {
        microtransactionId: microId,
        checkoutRequestId: stkResult.CheckoutRequestID,
        status: 'pending',
        amountKES: price.KES,
        label: price.label,
      },
    });
    return;
  }

  res.status(202).json({
    success: true,
    data: { microtransactionId: microId, status: 'pending', amountKES: price.KES, label: price.label },
  });
});

// ── Boost application (professional pays to rank #1) ─────────────────────────
// POST /applications/:appId/boost
// Professional pays KES 200 to float their application to the top of the list.
export const boostApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { appId } = req.params;
  const { phone, paymentMethod = 'mpesa' } = req.body;

  const appDoc = await col.jobApplications.doc(appId).get();
  if (!appDoc.exists) throw new NotFoundError('Application');
  const appData = appDoc.data() as JobApplication;
  if (appData.applicantId !== uid) throw new ForbiddenError();

  if (appData.isApplicationBoosted) {
    res.json({ success: true, data: { status: 'already_boosted' } });
    return;
  }

  const price = MICROTRANSACTION_PRICES.applicationBoost;
  // Deterministic ID: concurrent boost requests converge, preventing duplicate STK pushes.
  const microId = `boost_${uid}_${appId}`;

  // Idempotency: return existing pending/completed microtransaction rather than
  // issuing a second STK push.
  const existingMicro = await col.microtransactions.doc(microId).get();
  if (existingMicro.exists) {
    const em = existingMicro.data() as any;
    if (em.status !== 'failed') {
      res.json({
        success: true,
        data: {
          microtransactionId: microId,
          checkoutRequestId: em.mpesaCheckoutRequestId,
          status: em.status,
          amountKES: em.amountKES,
          label: price.label,
        },
      });
      return;
    }
  }
  const now = FieldValue.serverTimestamp();

  const micro = {
    type: 'application_boost' as const,
    userId: uid,
    targetId: appId,
    targetContextId: appData.jobId,
    amountKES: price.KES,
    amountUSD: price.USD,
    paymentMethod,
    status: 'pending' as const,
    createdAt: now,
  };
  await col.microtransactions.doc(microId).set(micro);

  if (paymentMethod === 'mpesa') {
    if (!phone) {
      res.status(400).json({ success: false, message: 'phone required for M-Pesa payment' });
      return;
    }
    const stkResult = await initiateStkPush({ amount: price.KES, phone, transactionId: microId, userId: uid });
    await col.microtransactions.doc(microId).update({ mpesaCheckoutRequestId: stkResult.CheckoutRequestID });
    res.status(202).json({
      success: true,
      data: {
        microtransactionId: microId,
        checkoutRequestId: stkResult.CheckoutRequestID,
        status: 'pending',
        amountKES: price.KES,
        label: price.label,
      },
    });
    return;
  }

  res.status(202).json({
    success: true,
    data: { microtransactionId: microId, status: 'pending', amountKES: price.KES, label: price.label },
  });
});

// ── Get application quota for today ──────────────────────────────────────────
// GET /quota/applications
// Returns how many applications the calling professional has left today.
export const getApplicationQuota = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  const tier = getEffectiveTier(userDoc.data() ?? {});
  const dailyLimit = DAILY_APPLICATION_LIMITS[tier] ?? 5;

  if (!isFinite(dailyLimit)) {
    res.json({ success: true, data: { tier, dailyLimit: null, used: null, remaining: null } });
    return;
  }

  const todayUTC = new Date().toISOString().slice(0, 10);
  const todayApps = await col.jobApplications
    .where('applicantId', '==', uid)
    .where('appliedDateKey', '==', todayUTC)
    .get();

  const used = todayApps.size;
  const remaining = Math.max(0, dailyLimit - used);
  res.json({ success: true, data: { tier, dailyLimit, used, remaining } });
});
