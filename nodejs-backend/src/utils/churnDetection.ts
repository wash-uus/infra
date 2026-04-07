/**
 * Churn Detection Utility
 *
 * Identifies at-risk users based on behavioural signals and triggers win-back offers.
 *
 * Churn signals tracked:
 *   - Inactivity > 14 days (last_seen threshold)
 *   - Subscription nearing expiry (≤ 7 days remaining)
 *   - Zero applications in last 30 days
 *   - Profile completeness < 40%
 *
 * Win-back offer types:
 *   - discount_20pct    — 20% off subscription renewal
 *   - free_boost_credit — 2 free boost credits
 *   - featured_listing  — 1 free featured listing
 *
 * Usage (run as a cron job or BullMQ scheduled job):
 *   import { runChurnDetection } from './churnDetection';
 *   await runChurnDetection();
 */

import { db, col } from '../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { enqueueNotification } from '../queues/notifications.queue';
import { logger } from './logger';

// ── Thresholds ────────────────────────────────────────────────────────────────

const INACTIVE_DAYS          = 14;   // days since lastSeen → churn signal
const EXPIRY_WARN_DAYS       = 7;    // days before subscription expiry
const WIN_BACK_OFFER_TTL     = 72;   // hours offer remains valid
const BATCH_SIZE             = 100;  // Firestore query page size

// ── Win-back offer configs ────────────────────────────────────────────────────

const WIN_BACK_OFFERS = [
  {
    type: 'discount_20pct',
    title: '20% Off — Come Back to INFRA Pro',
    body:  'We miss you! Use code WINBACK20 for 20% off your next subscription.',
    code:  'WINBACK20',
  },
  {
    type: 'free_boost_credit',
    title: '🎁 2 Free Boost Credits — Just For You',
    body:  'Apply faster and rank higher. 2 free boost credits added to your account.',
    code:  null,
  },
  {
    type: 'featured_listing',
    title: '🔥 Feature Your Listing Free',
    body:  "Your next job or tool listing is on us. Get seen by 10x more clients.",
    code:  null,
  },
];

function pickWinBackOffer(user: Record<string, any>) {
  // Paying users get a discount; free users get credits
  const tier = user.subscriptionTier ?? 'free';
  if (tier === 'pro' || tier === 'elite') {
    return WIN_BACK_OFFERS[0]; // discount
  }
  if (user.totalJobs > 0) {
    return WIN_BACK_OFFERS[2]; // featured listing for employers
  }
  return WIN_BACK_OFFERS[1]; // boost credits for job seekers
}

// ── Compute churn risk score for a user ──────────────────────────────────────
// Returns a 0–100 score. > 70 = high risk, 40–70 = medium, < 40 = low.

export function computeChurnRisk(user: Record<string, any>): {
  score: number;
  level: 'low' | 'medium' | 'high';
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;

  const now = Date.now();

  // 1. Inactivity signal
  const lastSeen: Date | null =
    user.lastSeen instanceof Timestamp ? user.lastSeen.toDate() :
    user.lastSeen ? new Date(user.lastSeen) : null;

  if (!lastSeen) {
    score += 30;
    signals.push('never_logged_in');
  } else {
    const daysSinceActive = (now - lastSeen.getTime()) / 86400_000;
    if (daysSinceActive > 30) { score += 40; signals.push('inactive_30d'); }
    else if (daysSinceActive > 14) { score += 20; signals.push('inactive_14d'); }
    else if (daysSinceActive > 7)  { score += 10; signals.push('inactive_7d'); }
  }

  // 2. Subscription expiry signal
  const expiresAt: Date | null =
    user.subscriptionTierExpiry ? new Date(user.subscriptionTierExpiry) :
    user.subscription?.expiresAt ? new Date(user.subscription.expiresAt) : null;

  if (expiresAt) {
    const daysToExpiry = (expiresAt.getTime() - now) / 86400_000;
    if (daysToExpiry < 0)   { score += 30; signals.push('subscription_expired'); }
    else if (daysToExpiry <= 3) { score += 20; signals.push('expiring_3d'); }
    else if (daysToExpiry <= 7) { score += 10; signals.push('expiring_7d'); }
  }

  // 3. Zero activity
  const completedProjects = user.completedProjects ?? 0;
  const totalJobs         = user.totalJobs ?? 0;
  if (completedProjects === 0 && totalJobs === 0) {
    score += 15;
    signals.push('zero_activity');
  }

  // 4. Low profile completeness
  const profileScore = user.profileCompleteScore ?? 0;
  if (profileScore < 40) { score += 15; signals.push('incomplete_profile'); }

  const level: 'low' | 'medium' | 'high' =
    score >= 70 ? 'high' :
    score >= 40 ? 'medium' : 'low';

  return { score: Math.min(score, 100), level, signals };
}

// ── Main churn detection job ──────────────────────────────────────────────────

export async function runChurnDetection(): Promise<{
  processed: number;
  highRisk: number;
  offersIssued: number;
}> {
  logger.info('Churn detection scan started');

  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400_000);
  let processed = 0;
  let highRisk  = 0;
  let offersIssued = 0;

  // Query users who haven't been seen recently (paid tiers prioritised)
  const snap = await col.users
    .where('lastSeen', '<', cutoff)
    .orderBy('lastSeen', 'asc')
    .limit(BATCH_SIZE)
    .get();

  for (const docSnap of snap.docs) {
    const uid  = docSnap.id;
    const user = docSnap.data() as Record<string, any>;
    processed++;

    const { score, level, signals } = computeChurnRisk(user);

    // Always persist the computed risk score
    await col.users.doc(uid).set(
      { churnRisk: score, churnLevel: level, churnSignals: signals },
      { merge: true },
    );

    // Record churn signal event
    await col.churnSignals.doc(`${uid}_${Date.now()}`).set({
      userId: uid,
      score,
      level,
      signals,
      detectedAt: FieldValue.serverTimestamp(),
      status: 'open',
    });

    if (level === 'high') {
      highRisk++;

      // Check if user already has an active win-back offer
      const existingOffer = await col.winBackOffers
        .where('userId', '==', uid)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (existingOffer.empty) {
        // Issue win-back offer
        const offer = pickWinBackOffer(user);
        const expiresAt = new Date(Date.now() + WIN_BACK_OFFER_TTL * 3600_000);

        await col.winBackOffers.add({
          userId: uid,
          type:   offer.type,
          code:   offer.code,
          status: 'active',
          expiresAt: expiresAt.toISOString(),
          createdAt: FieldValue.serverTimestamp(),
        });

        // Apply credit rewards immediately (discount requires manual code use)
        if (offer.type === 'free_boost_credit') {
          await col.users.doc(uid).set(
            { boostCredits: FieldValue.increment(2) },
            { merge: true },
          );
        }

        // Send push notification
        await enqueueNotification(uid, {
          type: 'reengagement',
          title: offer.title,
          body:  offer.body,
          recipientId: uid,
          data: { type: 'win_back', offerType: offer.type, code: offer.code ?? '' },
        });

        offersIssued++;
        logger.info('Win-back offer issued', { uid, offerType: offer.type, score });
      }
    }
  }

  logger.info('Churn detection scan complete', { processed, highRisk, offersIssued });
  return { processed, highRisk, offersIssued };
}
