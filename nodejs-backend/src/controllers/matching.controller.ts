/**
 * Matching Controller
 *
 * Surfaces AI match scores to:
 *   1. Job owners — see all applicants ranked by match score
 *   2. Applicants  — see their own match score for any job they applied to
 *   3. Platform admins — aggregate match data for tuning the algorithm
 */

import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { col } from '../config/firebase';
import { AuthRequest } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { computeMatchScore } from '../utils/matchScoring';

// ── Get ranked applicants for a job (job owner + admin) ──────────────────────
export const getJobMatchScores = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const isAdmin = req.user?.isAdmin ?? false;
  const { jobId } = req.params;

  const jobDoc = await col.jobs.doc(jobId).get();
  if (!jobDoc.exists) throw new NotFoundError('Job');

  const job = jobDoc.data() as any;
  if (job.postedBy !== uid && !isAdmin) {
    throw new ForbiddenError('Only the job owner can view ranked applicants');
  }

  const snapshot = await col.jobApplications
    .where('jobId', '==', jobId)
    .orderBy('matchScore', 'desc')
    .limit(100)
    .get();

  const applicants = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      applicationId:     d.id,
      applicantId:       data.applicantId,
      applicantName:     data.applicantName,
      applicantPhoto:    data.applicantPhoto,
      status:            data.status,
      matchScore:        data.matchScore   ?? null,
      matchGrade:        data.matchGrade   ?? null,
      matchBreakdown:    data.matchBreakdown ?? [],
      matchScoredAt:     data.matchScoredAt ?? null,
      proposedRate:      data.proposedRate,
      currency:          data.currency,
      appliedAt:         data.createdAt,
    };
  });

  // Apps without a score yet go to the end sorted by createdAt
  const scored   = applicants.filter((a) => a.matchScore !== null);
  const unscored = applicants.filter((a) => a.matchScore === null);

  res.json({
    success: true,
    data: { jobId, jobTitle: job.title, total: applicants.length, ranked: [...scored, ...unscored] },
  });
});

// ── Get my match score for a specific job (applicant) ────────────────────────
export const getMyMatchScore = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { jobId } = req.params;

  const [jobDoc, userDoc, appSnapshot] = await Promise.all([
    col.jobs.doc(jobId).get(),
    col.users.doc(uid).get(),
    col.jobApplications
      .where('jobId', '==', jobId)
      .where('applicantId', '==', uid)
      .limit(1)
      .get(),
  ]);

  if (!jobDoc.exists) throw new NotFoundError('Job');

  const job      = jobDoc.data() as any;
  const userData = userDoc.data() ?? {};

  // Compute live score even if they haven't applied yet
  const liveScore = computeMatchScore(userData, job);

  const application = appSnapshot.empty
    ? null
    : { id: appSnapshot.docs[0].id, ...appSnapshot.docs[0].data() } as any;

  res.json({
    success: true,
    data: {
      jobId,
      jobTitle:       job.title,
      applied:        !appSnapshot.empty,
      applicationId:  application?.id ?? null,
      storedScore:    application?.matchScore           ?? null,   // persisted score
      storedGrade:    application?.matchGrade           ?? null,
      liveResult:     liveScore,                                    // freshly computed
      tips: liveScore.mainGap
        ? [`Improve your score: ${liveScore.mainGap}`]
        : ['Great match! Your profile aligns well with this job.'],
    },
  });
});

// ── Batch re-score all applications for a job (admin/job-owner) ───────────────
export const rescoreJobApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid     = req.user!.uid;
  const isAdmin = req.user?.isAdmin ?? false;
  const { jobId } = req.params;

  const jobDoc = await col.jobs.doc(jobId).get();
  if (!jobDoc.exists) throw new NotFoundError('Job');

  const job = jobDoc.data() as any;
  if (job.postedBy !== uid && !isAdmin) {
    throw new ForbiddenError('Only the job owner can trigger re-scoring');
  }

  const appSnapshot = await col.jobApplications.where('jobId', '==', jobId).get();
  if (appSnapshot.empty) {
    res.json({ success: true, data: { updated: 0 } });
    return;
  }

  // load all applicant profiles in parallel (batch of 10)
  const apps = appSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
  const profileIds = [...new Set(apps.map((a) => a.applicantId))];

  const profileDocs = await Promise.all(profileIds.map((id: string) => col.users.doc(id).get()));
  const profiles: Record<string, any> = {};
  profileDocs.forEach((d) => { if (d.exists) profiles[d.id] = d.data(); });

  // Batch write
  const BATCH_SIZE = 400;
  let updated = 0;
  for (let i = 0; i < apps.length; i += BATCH_SIZE) {
    const batch = col.jobs.firestore.batch();
    for (const app of apps.slice(i, i + BATCH_SIZE)) {
      const prof    = profiles[app.applicantId] ?? {};
      const result  = computeMatchScore(prof, job);
      batch.update(col.jobApplications.doc(app.id), {
        matchScore:     result.totalScore,
        matchGrade:     result.matchGrade,
        matchBreakdown: result.breakdown,
        matchScoredAt:  new Date().toISOString(),
      });
      updated++;
    }
    await batch.commit();
  }

  res.json({ success: true, data: { jobId, updated } });
});
