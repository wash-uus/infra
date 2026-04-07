import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col, db } from '../config/firebase';
import { AuthRequest } from '../types';
import { NotFoundError, AppError, ForbiddenError } from '../utils/errors';
import { enqueueNotification } from '../queues/notifications.queue';
import { logger } from '../utils/logger';
import { invalidate } from '../utils/cache';

// ── Referral reward amounts ───────────────────────────────────────────────────
const REFERRAL_REWARDS = {
  referrer: {
    boostCredits: 1,       // 1 free application boost
    unlockCredits: 1,      // 1 free applicant unlock
    description: 'You earned 1 boost credit and 1 unlock credit for referring a new user!',
  },
  referee: {
    boostCredits: 1,
    description: 'Welcome to INFRA! You earned 1 free boost credit.',
  },
};

// ── Profile completeness weights ─────────────────────────────────────────────
const COMPLETENESS_FIELDS: Array<{ field: string; weight: number; label: string }> = [
  { field: 'displayName',       weight: 10, label: 'Add your full name' },
  { field: 'bio',               weight: 15, label: 'Write a professional bio' },
  { field: 'profilePhotoUrl',   weight: 10, label: 'Upload a profile photo' },
  { field: 'country',           weight: 5,  label: 'Set your country' },
  { field: 'city',              weight: 5,  label: 'Set your city' },
  { field: 'disciplines',       weight: 10, label: 'Add your engineering disciplines' },
  { field: 'specialties',       weight: 10, label: 'Add your specialties' },
  { field: 'yearsExperience',   weight: 5,  label: 'Enter years of experience' },
  { field: 'hourlyRate',        weight: 5,  label: 'Set your hourly rate' },
  { field: 'portfolioUrl',      weight: 10, label: 'Add a portfolio link' },
  { field: 'linkedinUrl',       weight: 5,  label: 'Add LinkedIn profile' },
  { field: 'phoneNumber',       weight: 5,  label: 'Verify phone number' },
  { field: 'certifications',    weight: 5,  label: 'Add certifications' },
];
const MAX_SCORE = COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0);

// ── Compute profile completeness ──────────────────────────────────────────────
export function computeCompleteness(profile: Record<string, any>): {
  score: number;
  percentage: number;
  missing: Array<{ field: string; label: string; weight: number }>;
  completed: string[];
} {
  let score = 0;
  const missing: Array<{ field: string; label: string; weight: number }> = [];
  const completed: string[] = [];

  for (const { field, weight, label } of COMPLETENESS_FIELDS) {
    const val = profile[field];
    const hasValue =
      val !== undefined &&
      val !== null &&
      val !== '' &&
      !(Array.isArray(val) && val.length === 0);

    if (hasValue) {
      score += weight;
      completed.push(field);
    } else {
      missing.push({ field, label, weight });
    }
  }

  // Sort missing by weight descending — highest-value nudges first
  missing.sort((a, b) => b.weight - a.weight);

  return {
    score,
    percentage: Math.round((score / MAX_SCORE) * 100),
    missing,
    completed,
  };
}

// ── GET /referrals/my-code — return current user's referral code ──────────────
export const getMyReferralCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const doc = await col.users.doc(uid).get();
  if (!doc.exists) throw new NotFoundError('Profile');

  const data = doc.data()!;
  const referralCode: string = data.referralCode ?? uid.slice(0, 8).toUpperCase();

  // Persist code if missing
  if (!data.referralCode) {
    await col.users.doc(uid).set({ referralCode }, { merge: true });
  }

  res.json({ success: true, data: { referralCode } });
});

// ── GET /referrals/stats — referral stats for current user ──────────────────
export const getReferralStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;

  const [doc, referralSnap] = await Promise.all([
    col.users.doc(uid).get(),
    db.collection('referrals')
      .where('referrerId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
  ]);

  if (!doc.exists) throw new NotFoundError('Profile');

  const referrals = referralSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const confirmed = referrals.filter((r: any) => r.status === 'confirmed').length;
  const pending   = referrals.filter((r: any) => r.status === 'pending').length;

  const userData = doc.data()!;

  res.json({
    success: true,
    data: {
      referralCode:   userData.referralCode ?? uid.slice(0, 8).toUpperCase(),
      referralLink:   `https://infra.co.ke/signup?ref=${userData.referralCode ?? uid.slice(0, 8).toUpperCase()}`,
      totalReferrals: referrals.length,
      confirmed,
      pending,
      boostCredits:   userData.boostCredits   ?? 0,
      unlockCredits:  userData.unlockCredits  ?? 0,
      referrals,
    },
  });
});

// ── GET /referrals/leaderboard — top 20 referrers ───────────────────────────
export const getReferralLeaderboard = asyncHandler(async (_req: AuthRequest, res: Response) => {
  // Aggregate from referrals collection — top referrers by confirmed count
  const snap = await db.collection('referrals')
    .where('status', '==', 'confirmed')
    .get();

  // Count per referrer
  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const referrerId = (d.data() as any).referrerId;
    if (referrerId) counts[referrerId] = (counts[referrerId] ?? 0) + 1;
  });

  // Sort + top 20
  const ranked = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  // Fetch display names
  const leaderboard = await Promise.all(
    ranked.map(async ([uid, count], idx) => {
      const userDoc = await col.users.doc(uid).get();
      const user = userDoc.data() ?? {};
      return {
        rank: idx + 1,
        uid,
        displayName: user.displayName ?? 'Anonymous',
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        referralCount: count,
      };
    }),
  );

  res.json({ success: true, data: leaderboard });
});

// ── POST /referrals/apply — apply a referral code at signup ─────────────────
// Called after the new user creates their profile.
export const applyReferralCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { referralCode } = req.body as { referralCode: string };

  if (!referralCode || typeof referralCode !== 'string') {
    throw new AppError('referralCode is required', 400);
  }

  const code = referralCode.trim().toUpperCase();

  // Find the referrer by code
  const referrerSnap = await col.users
    .where('referralCode', '==', code)
    .limit(1)
    .get();

  if (referrerSnap.empty) {
    throw new NotFoundError('Referral code');
  }

  const referrerDoc = referrerSnap.docs[0];
  const referrerId  = referrerDoc.id;

  // Prevent self-referral
  if (referrerId === uid) {
    throw new ForbiddenError('Cannot apply your own referral code');
  }

  // Check if this user already used a referral code
  const myDoc = await col.users.doc(uid).get();
  if (!myDoc.exists) throw new NotFoundError('Profile');
  if ((myDoc.data() as any).referredBy) {
    throw new AppError('You have already used a referral code', 409);
  }

  const now = FieldValue.serverTimestamp();

  // Batch: record referral + reward both parties
  const batch = db.batch();

  // Record the referral event
  const referralRef = db.collection('referrals').doc(`${referrerId}_${uid}`);
  batch.set(referralRef, {
    referrerId,
    refereeId:    uid,
    referralCode: code,
    status:       'pending', // confirmed after referee completes first action
    createdAt:    now,
    confirmedAt:  null,
  });

  // Mark referee as referred
  batch.set(col.users.doc(uid), { referredBy: referrerId }, { merge: true });

  // Give referee signup reward
  batch.set(col.users.doc(uid),
    { boostCredits: FieldValue.increment(REFERRAL_REWARDS.referee.boostCredits) },
    { merge: true },
  );

  await batch.commit();

  // Notify referee
  enqueueNotification(uid, {
    type: 'referral',
    title: '🎁 Welcome Bonus Unlocked!',
    body: REFERRAL_REWARDS.referee.description,
    recipientId: uid,
    data: { type: 'referral_bonus' },
  }).catch(() => {});

  logger.info('Referral code applied', { referrerId, refereeId: uid, code });

  res.json({
    success: true,
    message: 'Referral applied! You earned a free boost credit.',
    data: { boostCreditsEarned: REFERRAL_REWARDS.referee.boostCredits },
  });
});

// ── POST /referrals/confirm/:refereeId — confirm referral on first job/apply ─
// Called internally when a referee completes their first meaningful action.
export const confirmReferral = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refereeId } = req.params;

  // Only the referee themselves can confirm their own referral.
  // This prevents any authenticated user from prematurely triggering
  // another user's referral reward.
  if (req.user!.uid !== refereeId) {
    throw new ForbiddenError('You can only confirm your own referral');
  }

  const now = FieldValue.serverTimestamp();

  // Find the referral
  const snap = await db.collection('referrals')
    .where('refereeId', '==', refereeId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (snap.empty) {
    res.json({ success: true, message: 'No pending referral to confirm' });
    return;
  }

  const referralDoc = snap.docs[0];
  const { referrerId } = referralDoc.data() as any;

  // Use a Firestore transaction with a re-read to prevent concurrent calls from
  // double-rewarding the referrer (TOCTOU: both reads see 'pending' simultaneously).
  const alreadyConfirmed = await db.runTransaction(async (txn) => {
    const freshDoc = await txn.get(referralDoc.ref);
    if (freshDoc.data()?.status !== 'pending') return true; // already handled

    txn.update(referralDoc.ref, { status: 'confirmed', confirmedAt: now });
    txn.set(
      col.users.doc(referrerId),
      {
        boostCredits:  FieldValue.increment(REFERRAL_REWARDS.referrer.boostCredits),
        unlockCredits: FieldValue.increment(REFERRAL_REWARDS.referrer.unlockCredits),
      },
      { merge: true },
    );
    return false;
  });

  if (alreadyConfirmed) {
    res.json({ success: true, message: 'Referral already confirmed' });
    return;
  }

  // Notify referrer
  enqueueNotification(referrerId, {
    type: 'referral',
    title: '🎉 Referral Confirmed!',
    body: REFERRAL_REWARDS.referrer.description,
    recipientId: referrerId,
    data: { type: 'referral_confirmed', refereeId },
  }).catch(() => {});

  await invalidate(`user:profile:${referrerId}`);

  logger.info('Referral confirmed', { referrerId, refereeId });

  res.json({ success: true, message: 'Referral confirmed and referrer rewarded.' });
});

// ── GET /profile/completeness — get profile completeness score + nudges ──────
export const getProfileCompleteness = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const doc = await col.users.doc(uid).get();
  if (!doc.exists) throw new NotFoundError('Profile');

  const profile = doc.data() as Record<string, any>;
  const result  = computeCompleteness(profile);

  // Store computed score on user doc for Firestore queries (e.g. churn risk)
  await col.users.doc(uid).set(
    { profileCompleteScore: result.percentage },
    { merge: true },
  );

  res.json({
    success: true,
    data: {
      score:      result.score,
      percentage: result.percentage,
      completed:  result.completed,
      missing:    result.missing,
      nextNudge:  result.missing[0] ?? null, // highest-value action
      tier: (() => {
        if (result.percentage >= 90) return 'champion';
        if (result.percentage >= 70) return 'strong';
        if (result.percentage >= 50) return 'growing';
        return 'starter';
      })(),
    },
  });
});
