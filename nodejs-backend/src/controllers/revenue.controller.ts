import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { col, db } from '../config/firebase';
import { AuthRequest } from '../types';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { assignABTest, trackABConversion, getPlanPricesForUser } from '../utils/abtest';
import { computeChurnRisk, runChurnDetection } from '../utils/churnDetection';
import { logger } from '../utils/logger';

// ── GET /revenue/prices — return personalized plan prices (A/B test aware) ───
export const getPrices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid    = req.user!.uid;
  const prices = await getPlanPricesForUser(uid);
  res.json({ success: true, data: prices });
});

// ── POST /revenue/ab-conversion — track A/B test conversion ─────────────────
export const trackConversion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { testName, eventName, value } = req.body as {
    testName:  string;
    eventName: string;
    value?:    number;
  };

  if (!testName || !eventName) throw new AppError('testName and eventName are required', 400);

  await trackABConversion(uid, testName, eventName, value);
  res.json({ success: true });
});

// ── GET /revenue/metrics — aggregate revenue metrics (admin only) ────────────
export const getRevenueMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  if (!userDoc.exists) throw new NotFoundError('User');
  if ((userDoc.data() as any)?.role !== 'admin') throw new ForbiddenError();

  const now   = new Date();
  const day30 = new Date(now.getTime() - 30 * 86400_000);
  const day60 = new Date(now.getTime() - 60 * 86400_000);

  // ── Subscription revenue ──────────────────────────────────────────────────
  const [sub30, sub60] = await Promise.all([
    col.subscriptions
      .where('status',    '==', 'active')
      .where('createdAt', '>=', day30)
      .get(),
    col.subscriptions
      .where('status',    '==', 'active')
      .where('createdAt', '>=', day60)
      .where('createdAt', '<',  day30)
      .get(),
  ]);

  const calcRevenue = (docs: FirebaseFirestore.QuerySnapshot) =>
    docs.docs.reduce((sum, d) => sum + ((d.data() as any).amount ?? 0), 0);

  const rev30 = calcRevenue(sub30);
  const rev60 = calcRevenue(sub60);
  const revGrowth = rev60 > 0 ? Math.round(((rev30 - rev60) / rev60) * 100) : 0;

  // ── Transaction / escrow commission ──────────────────────────────────────
  const commissionSnap = await db.collection('commissions')
    .where('createdAt', '>=', day30)
    .get();

  const commissionRev = commissionSnap.docs.reduce(
    (sum, d) => sum + ((d.data() as any).commissionAmount ?? 0), 0,
  );

  // ── User counts by tier ───────────────────────────────────────────────────
  const [freeUsers, proUsers, eliteUsers] = await Promise.all([
    col.users.where('subscriptionTier', '==', 'free' ).get(),
    col.users.where('subscriptionTier', '==', 'pro'  ).get(),
    col.users.where('subscriptionTier', '==', 'elite').get(),
  ]);

  const totalPaid = proUsers.size + eliteUsers.size;

  // ── ARPU (Average Revenue Per User) ──────────────────────────────────────
  const totalRevenue30 = rev30 + commissionRev;
  const arpu = totalPaid > 0 ? Math.round(totalRevenue30 / totalPaid) : 0;

  // ── Estimated LTV (ARPU × average subscription length in months) ─────────
  // Rough LTV assuming 4-month average retention for paid users
  const avgRetentionMonths = 4;
  const ltv = arpu * avgRetentionMonths;

  // ── CAC proxy (total active users / marketing spend — estimated) ─────────
  // Without direct marketing spend data, we calculate new signups per 30 days
  const newUsersSnap = await col.users.where('createdAt', '>=', day30).get();
  const newUsers30   = newUsersSnap.size;

  // ── Churn rate (users who became inactive last 30d / total active prior) ──
  const churnHighSnap = await col.users
    .where('churnLevel', '==', 'high')
    .get();
  const churnRate = totalPaid > 0
    ? Math.round((churnHighSnap.size / (totalPaid + churnHighSnap.size)) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      period: '30d',
      revenue: {
        subscriptions:  rev30,
        commissions:    commissionRev,
        total:          totalRevenue30,
        growth30d:      `${revGrowth > 0 ? '+' : ''}${revGrowth}%`,
      },
      users: {
        free:   freeUsers.size,
        pro:    proUsers.size,
        elite:  eliteUsers.size,
        total:  freeUsers.size + totalPaid,
        new30d: newUsers30,
      },
      metrics: {
        arpu_kes:       arpu,
        ltv_kes:        ltv,
        churn_rate_pct: churnRate,
        high_risk_users: churnHighSnap.size,
      },
      forecasts: {
        rev_60d_kes:  Math.round(rev30 * 1.15 * 2), // conservative 15% MoM growth
        rev_90d_kes:  Math.round(rev30 * 1.15 * 1.15 * 3),
        users_30d:    Math.round((freeUsers.size + totalPaid) * 1.12),
      },
    },
  });
});

// ── POST /revenue/churn-scan — trigger churn detection job (admin only) ──────
export const triggerChurnScan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  if (!userDoc.exists) throw new NotFoundError('User');
  if ((userDoc.data() as any)?.role !== 'admin') throw new ForbiddenError();

  // Run async — don't block the HTTP response
  runChurnDetection().catch((err) => {
    logger.error('Churn detection scan failed', { error: err.message });
  });

  res.json({ success: true, message: 'Churn detection scan started in background.' });
});

// ── GET /revenue/churn-risk — get my own churn risk score ───────────────────
export const getMyChurnRisk = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const doc = await col.users.doc(uid).get();
  if (!doc.exists) throw new NotFoundError('Profile');

  const user = doc.data() as Record<string, any>;
  const { score, level, signals } = computeChurnRisk(user);

  // Fetch win-back offer if available
  const offerSnap = await col.winBackOffers
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  const offer = offerSnap.empty ? null : offerSnap.docs[0].data();

  res.json({
    success: true,
    data: {
      churnRisk: { score, level, signals },
      winBackOffer: offer ? {
        type:      offer.type,
        title:     offer.title,
        code:      offer.code ?? null,
        expiresAt: offer.expiresAt,
      } : null,
    },
  });
});
