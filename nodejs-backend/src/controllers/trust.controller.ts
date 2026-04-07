/**
 * Trust Controller — Fraud Scoring & Verified Badges
 *
 * Two concerns:
 *   1. Fraud risk scoring: continuous risk evaluation per user (0–100 score)
 *      Signals: failed payments, abuse reports, login anomalies, account age
 *   2. Verified badge system: manual document submission → admin review → grant badge
 *      Types: identity, professional_license, company
 *
 * Data lives in:
 *   fraudScores    — one doc per user, updated on any trigger event
 *   verifiedBadges — one doc per user + badge type, lifecycle: pending → approved/denied
 */

import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col, db } from '../config/firebase';
import { AuthRequest } from '../types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { enqueueNotification } from '../queues/notifications.queue';

// ── Fraud risk levels ─────────────────────────────────────────────────────────
const RISK_LEVELS = { low: 0, medium: 30, high: 60, critical: 80 } as const;
type RiskLevel = keyof typeof RISK_LEVELS;

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// ── Compute fraud risk score for a user ──────────────────────────────────────
async function computeFraudScore(userId: string): Promise<{ score: number; level: RiskLevel; signals: string[] }> {
  const [userDoc, txSnap, reportSnap] = await Promise.all([
    col.users.doc(userId).get(),
    col.transactions.where('senderId', '==', userId).where('status', '==', 'failed').limit(10).get(),
    col.abuseReports.where('reportedUserId', '==', userId).where('status', '==', 'confirmed').limit(5).get(),
  ]);

  const user    = userDoc.data() ?? {};
  const signals: string[] = [];
  let score = 0;

  // === Signal: Account age (< 7 days = higher risk) ===
  if (user.createdAt) {
    const ageMs = Date.now() - (user.createdAt.toMillis?.() ?? 0);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 1) { score += 30; signals.push('account_very_new'); }
    else if (ageDays < 7) { score += 15; signals.push('account_new'); }
  }

  // === Signal: Failed payment attempts ===
  const failedPayments = txSnap.size;
  if (failedPayments >= 5) { score += 30; signals.push(`failed_payments_x${failedPayments}`); }
  else if (failedPayments >= 2) { score += 15; signals.push(`failed_payments_x${failedPayments}`); }

  // === Signal: Abuse reports ===
  const reportCount = reportSnap.size;
  if (reportCount >= 3) { score += 35; signals.push(`abuse_reports_x${reportCount}`); }
  else if (reportCount >= 1) { score += 20; signals.push(`abuse_report`); }

  // === Signal: Email not verified ===
  if (!user.emailVerified) { score += 10; signals.push('email_unverified'); }

  // === Signal: Incomplete profile ===
  const profileFields = ['displayName', 'country', 'disciplines', 'photoURL'];
  const missing = profileFields.filter((f) => !user[f]);
  if (missing.length >= 3) { score += 10; signals.push('profile_very_incomplete'); }

  // === Signal: Previously flagged ===
  if (user.isBanned || user.isSuspended) { score += 40; signals.push('account_restricted'); }

  // Cap at 100
  score = Math.min(score, 100);
  const level = scoreToLevel(score);

  return { score, level, signals };
}

// ── Get fraud risk score — admin only ────────────────────────────────────────
export const getFraudScore = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');
  const { userId } = req.params;

  const userDoc = await col.users.doc(userId).get();
  if (!userDoc.exists) throw new NotFoundError('User');

  const { score, level, signals } = await computeFraudScore(userId);

  // Persist the score
  await col.fraudScores.doc(userId).set({
    userId,
    score,
    riskLevel: level,
    signals,
    calculatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  res.json({ success: true, data: { userId, score, riskLevel: level, signals } });
});

// ── Batch recompute fraud scores — admin only ────────────────────────────────
export const batchRecomputeFraudScores = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');

  // Only recompute users flagged or with existing medium/high risk scores
  const snapshot = await col.fraudScores
    .where('riskLevel', 'in', ['medium', 'high', 'critical'])
    .limit(200)
    .get();

  const userIds = snapshot.docs.map((d) => d.id);
  let updated = 0;

  for (const userId of userIds) {
    try {
      const { score, level, signals } = await computeFraudScore(userId);
      await col.fraudScores.doc(userId).set({
        userId, score, riskLevel: level, signals,
        calculatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Auto-flag critical users
      if (level === 'critical') {
        await col.users.doc(userId).update({ isFlagged: true, updatedAt: FieldValue.serverTimestamp() });
      }
      updated++;
    } catch (err: any) {
      logger.warn('Failed to recompute fraud score', { userId, error: err.message });
    }
  }

  res.json({ success: true, data: { updated } });
});

// ── Get fraud risk dashboard (admin) ─────────────────────────────────────────
export const getFraudDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');

  const [criticalSnap, highSnap, mediumSnap] = await Promise.all([
    col.fraudScores.where('riskLevel', '==', 'critical').orderBy('calculatedAt', 'desc').limit(20).get(),
    col.fraudScores.where('riskLevel', '==', 'high').orderBy('calculatedAt', 'desc').limit(20).get(),
    col.fraudScores.where('riskLevel', '==', 'medium').orderBy('calculatedAt', 'desc').limit(20).get(),
  ]);

  res.json({
    success: true,
    data: {
      critical: criticalSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      high:     highSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      medium:   mediumSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      totals: {
        critical: criticalSnap.size,
        high:     highSnap.size,
        medium:   mediumSnap.size,
      },
    },
  });
});

// ── Submit badge verification request ───────────────────────────────────────
const BADGE_TYPES = ['identity', 'professional_license', 'company'] as const;
type BadgeType = typeof BADGE_TYPES[number];

export const submitBadgeVerification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { badgeType, documentUrl, documentNote } = req.body;

  if (!BADGE_TYPES.includes(badgeType as BadgeType)) {
    throw new BadRequestError(`Invalid badge type. Must be one of: ${BADGE_TYPES.join(', ')}`);
  }

  if (!documentUrl?.trim()) {
    throw new BadRequestError('Document URL or reference is required');
  }

  // Check for existing pending / approved badge of same type
  const existing = await col.verifiedBadges
    .where('userId', '==', uid)
    .where('type', '==', badgeType)
    .where('status', 'in', ['pending', 'approved'])
    .limit(1)
    .get();

  if (!existing.empty) {
    const s = existing.docs[0].data().status;
    throw new BadRequestError(`You already have a ${s} ${badgeType} badge`);
  }

  const badgeId = `${uid}_${badgeType}`;

  await col.verifiedBadges.doc(badgeId).set({
    userId:       uid,
    type:         badgeType,
    status:       'pending',
    documentUrl:  documentUrl.trim(),
    documentNote: documentNote?.trim() ?? null,
    submittedAt:  FieldValue.serverTimestamp(),
    reviewedAt:   null,
    reviewedBy:   null,
    denyReason:   null,
  });

  res.status(201).json({ success: true, data: { id: badgeId, type: badgeType, status: 'pending' } });
});

// ── Get my badge status ───────────────────────────────────────────────────────
export const getMyBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;

  const snapshot = await col.verifiedBadges
    .where('userId', '==', uid)
    .get();

  const badges = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: badges });
});

// ── Admin: list pending badge verification requests ───────────────────────────
export const listPendingBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');

  const snapshot = await col.verifiedBadges
    .where('status', '==', 'pending')
    .orderBy('submittedAt', 'asc')
    .limit(50)
    .get();

  const pending = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: pending });
});

// ── Admin: approve badge ──────────────────────────────────────────────────────
export const approveBadge = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');
  const adminUid  = req.user!.uid;
  const { badgeId } = req.params;

  const badgeDoc = await col.verifiedBadges.doc(badgeId).get();
  if (!badgeDoc.exists) throw new NotFoundError('Badge request');

  const badge = badgeDoc.data() as any;
  if (badge.status !== 'pending') {
    throw new BadRequestError(`Badge is already ${badge.status}`);
  }

  const now = FieldValue.serverTimestamp();

  const batch = db.batch();
  batch.update(col.verifiedBadges.doc(badgeId), {
    status:     'approved',
    reviewedBy: adminUid,
    reviewedAt: now,
  });
  // Write badge onto user's profile for fast reads
  batch.update(col.users.doc(badge.userId), {
    [`badges.${badge.type}`]: 'verified',
    verificationStatus: 'verified',
    updatedAt: now,
  });
  await batch.commit();

  // Notify the user
  enqueueNotification(badge.userId, {
    type:        'badge_approved',
    title:       'Verification Approved ✓',
    body:        `Your ${badge.type.replace(/_/g, ' ')} verification has been approved.`,
    recipientId: badge.userId,
    data:        { badgeId, badgeType: badge.type },
  }).catch(() => {});

  logger.info('Badge approved', { badgeId, userId: badge.userId, type: badge.type, approvedBy: adminUid });
  res.json({ success: true, data: { id: badgeId, status: 'approved' } });
});

// ── Admin: deny badge ─────────────────────────────────────────────────────────
export const denyBadge = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');
  const adminUid  = req.user!.uid;
  const { badgeId } = req.params;
  const { reason }  = req.body;

  const badgeDoc = await col.verifiedBadges.doc(badgeId).get();
  if (!badgeDoc.exists) throw new NotFoundError('Badge request');
  const badge = badgeDoc.data() as any;

  if (badge.status !== 'pending') {
    throw new BadRequestError(`Badge is already ${badge.status}`);
  }

  await col.verifiedBadges.doc(badgeId).update({
    status:     'denied',
    denyReason: reason?.trim() ?? null,
    reviewedBy: adminUid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  enqueueNotification(badge.userId, {
    type:        'badge_denied',
    title:       'Verification Request Declined',
    body:        `Your ${badge.type.replace(/_/g, ' ')} verification was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    recipientId: badge.userId,
    data:        { badgeId, badgeType: badge.type },
  }).catch(() => {});

  res.json({ success: true, data: { id: badgeId, status: 'denied' } });
});
