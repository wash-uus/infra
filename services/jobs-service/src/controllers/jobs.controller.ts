/**
 * Jobs Service Controller
 *
 * Handles all job-related operations as an independent microservice.
 * Job data is stored in Firestore; this service owns the jobs + jobApplications
 * collections and emits Pub/Sub events for downstream consumers (notifications,
 * search indexing, analytics).
 */

import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { col, db } from '../config/firebase';
import { AuthRequest, Job, JobApplication } from '../types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler';
import { cached, invalidate, invalidatePattern } from '../config/redis';
import { logger } from '../config/logger';
import { publish, Topics } from '../events/publisher';
import { computeMatchScore } from '../utils/matchScoring';

// ── Validation schemas ────────────────────────────────────────────────────────
const CreateJobSchema = z.object({
  title:           z.string().min(3).max(200),
  description:     z.string().min(10).max(10_000),
  listingType:     z.enum(['full_time', 'contract', 'part_time', 'freelance']),
  category:        z.string().min(1).max(100),
  country:         z.string().min(2).max(100),
  disciplineId:    z.string().max(100).optional(),
  isRemote:        z.boolean().optional(),
  budget:          z.number().positive().optional(),
  currency:        z.string().length(3).optional(),
  isFeatured:      z.boolean().optional(),
  skills:          z.array(z.string().max(50)).max(20).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'expert']).optional(),
  employmentType:  z.string().max(50).optional(),
  deadline:        z.string().datetime().optional(),
});

const UpdateJobSchema = CreateJobSchema.partial().omit({ isFeatured: true });

const ApplyJobSchema = z.object({
  coverLetter:  z.string().min(20).max(5000),
  proposedRate: z.number().positive().optional(),
  currency:     z.string().length(3).optional(),
});

// ── List jobs (with Redis cache) ──────────────────────────────────────────────
export const listJobs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    listingType, category, country, isRemote, disciplineId,
    status = 'posted', featured,
    cursor, pageSize = '20',
  } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query = col.jobs.where('status', '==', status);
  if (listingType)              query = query.where('listingType', '==', listingType);
  if (category)                 query = query.where('category', '==', category);
  if (country)                  query = query.where('country', '==', country);
  if (disciplineId)             query = query.where('disciplineId', '==', disciplineId);
  if (isRemote === 'true')      query = query.where('isRemote', '==', true);
  if (featured === 'true')      query = query.where('isFeatured', '==', true);

  const limit = Math.min(parseInt(pageSize, 10), 50);
  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (cursor) {
    const cursorDoc = await col.jobs.doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const cacheKey = `jobs:list:${JSON.stringify({ listingType, category, country, status, disciplineId, isRemote, featured, cursor, pageSize })}`;
  const jobs = await cached(cacheKey, 60, async () => {
    const snapshot = await query.get();
    const now = Date.now();
    return snapshot.docs.map((d) => {
      const job = { id: d.id, ...d.data() } as Record<string, any>;
      if (job.isFeatured && job.featuredExpiresAt) {
        const expiryMs = typeof job.featuredExpiresAt.toMillis === 'function'
          ? job.featuredExpiresAt.toMillis()
          : (job.featuredExpiresAt._seconds ?? 0) * 1000;
        if (expiryMs < now) job.isFeatured = false;
      }
      return job;
    });
  });

  // Cache-control for public CDN caching
  if (!req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  }

  res.json({ success: true, data: jobs, meta: { cursor: jobs.length === limit ? jobs[jobs.length - 1]?.id : null } });
});

// ── Get single job ────────────────────────────────────────────────────────────
export const getJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const cacheKey = `job:${id}`;
  const job = await cached(cacheKey, 120, async () => {
    const doc = await col.jobs.doc(id).get();
    if (!doc.exists) throw new NotFoundError('Job');
    return { id: doc.id, ...doc.data() };
  });

  res.json({ success: true, data: job });
});

// ── Create job ────────────────────────────────────────────────────────────────
export const createJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;

  const parsed = CreateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '));
  }

  const jobId = uuidv4();
  const now   = FieldValue.serverTimestamp();

  const job: Omit<Job, 'id'> = {
    ...parsed.data,
    postedBy:          uid,
    status:            'posted',
    applicationsCount: 0,
    createdAt:         now as any,
    updatedAt:         now as any,
  };

  await col.jobs.doc(jobId).set(job);
  await invalidatePattern('jobs:list:*');

  // Publish event for search indexing + notifications
  publish(Topics.JOB_CREATED, { jobId, job, postedBy: uid }).catch((err) =>
    logger.warn('Failed to publish job.created event', { error: err.message }),
  );

  res.status(201).json({ success: true, data: { id: jobId, ...job } });
});

// ── Update job ────────────────────────────────────────────────────────────────
export const updateJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid      = req.user!.uid;
  const isAdmin  = req.user?.isAdmin ?? false;
  const { id }   = req.params;

  const parsed = UpdateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '));
  }

  const doc = await col.jobs.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Job');

  const existing = doc.data() as Job;
  if (existing.postedBy !== uid && !isAdmin) {
    throw new ForbiddenError('You can only edit your own jobs');
  }

  const updates = { ...parsed.data, updatedAt: FieldValue.serverTimestamp() };

  await col.jobs.doc(id).update(updates);
  await Promise.all([invalidate(`job:${id}`), invalidatePattern('jobs:list:*')]);

  publish(Topics.JOB_UPDATED, { jobId: id, updates }).catch(() => {});

  res.json({ success: true, data: { id, ...updates } });
});

// ── Close job ─────────────────────────────────────────────────────────────────
export const closeJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid     = req.user!.uid;
  const isAdmin = req.user?.isAdmin ?? false;
  const { id }  = req.params;

  const doc = await col.jobs.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Job');

  const existing = doc.data() as Job;
  if (existing.postedBy !== uid && !isAdmin) {
    throw new ForbiddenError('You can only close your own jobs');
  }

  await col.jobs.doc(id).update({ status: 'closed', updatedAt: FieldValue.serverTimestamp() });
  await Promise.all([invalidate(`job:${id}`), invalidatePattern('jobs:list:*')]);

  res.json({ success: true });
});

// ── Apply to job ──────────────────────────────────────────────────────────────
export const applyToJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid  = req.user!.uid;
  const { id } = req.params;

  const parsed = ApplyJobSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '));
  }

  const [jobDoc, userDoc] = await Promise.all([
    col.jobs.doc(id).get(),
    col.users.doc(uid).get(),
  ]);

  if (!jobDoc.exists) throw new NotFoundError('Job');
  const job = jobDoc.data() as Job;

  if (job.postedBy === uid) throw new ForbiddenError('Cannot apply to your own job');

  const userData = userDoc.data() ?? {};
  // Deterministic composite ID prevents concurrent duplicate applications —
  // the transaction below uses this as the atomic dedup key.
  const appId          = `${uid}_${id}`;
  const now            = FieldValue.serverTimestamp();
  const appliedDateKey = new Date().toISOString().slice(0, 10);

  const application: Omit<JobApplication, 'id'> = {
    jobId:          id,
    jobTitle:       job.title,
    applicantId:    uid,
    applicantName:  userData.displayName ?? '',
    applicantPhoto: userData.photoURL,
    coverLetter:    parsed.data.coverLetter,
    proposedRate:   parsed.data.proposedRate,
    currency:       parsed.data.currency ?? job.currency,
    status:         'pending',
    appliedDateKey,
    createdAt:      now as any,
    updatedAt:      now as any,
  };

  // Atomic transaction: dedup check + create application + increment counter.
  // runTransaction retries on contention, ensuring exactly-once application creation
  // even under simultaneous requests from the same user.
  await db.runTransaction(async (txn) => {
    const existingSnap = await txn.get(col.jobApplications.doc(appId));
    if (existingSnap.exists) throw new BadRequestError('You have already applied to this job');
    txn.set(col.jobApplications.doc(appId), application);
    txn.update(col.jobs.doc(id), { applicationsCount: FieldValue.increment(1) });
  });

  // Compute AI match score asynchronously (non-blocking)
  computeMatchAndStore(appId, userData, job).catch((err) =>
    logger.warn('Match scoring failed', { appId, error: err?.message }),
  );

  // Publish for notifications + analytics
  publish(Topics.APPLICATION_CREATED, {
    applicationId: appId,
    jobId: id,
    jobOwnerId: job.postedBy,
    applicantId: uid,
    applicantName: userData.displayName,
  }).catch(() => {});

  res.status(201).json({ success: true, data: { id: appId, ...application } });
});

// ── Get applications for a job (job owner + admin) ────────────────────────────
export const getJobApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid     = req.user!.uid;
  const isAdmin = req.user?.isAdmin ?? false;
  const { id }  = req.params;

  const jobDoc = await col.jobs.doc(id).get();
  if (!jobDoc.exists) throw new NotFoundError('Job');

  const job = jobDoc.data() as Job;
  if (job.postedBy !== uid && !isAdmin) {
    throw new ForbiddenError('Only the job owner can view applications');
  }

  const sortBy = (req.query.sortBy as string) === 'matchScore' ? 'matchScore' : 'createdAt';
  const snapshot = await col.jobApplications
    .where('jobId', '==', id)
    .orderBy(sortBy, 'desc')
    .get();

  const applications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  res.json({
    success: true,
    data:    applications,
    meta:    { total: applications.length },
  });
});

// ── Get my applications (authenticated user) ──────────────────────────────────
export const getMyApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;

  const snapshot = await col.jobApplications
    .where('applicantId', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const applications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  res.json({ success: true, data: applications });
});

// ── Private helper: compute + persist match score ─────────────────────────────
async function computeMatchAndStore(
  appId: string,
  userData: Record<string, any>,
  job: Job,
): Promise<void> {
  const result = computeMatchScore(userData, job);
  await col.jobApplications.doc(appId).update({
    matchScore:     result.totalScore,
    matchGrade:     result.matchGrade,
    matchBreakdown: result.breakdown,
    matchScoredAt:  new Date().toISOString(),
  });
}
