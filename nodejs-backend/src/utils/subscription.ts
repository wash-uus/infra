/**
 * Subscription utilities — SINGLE SOURCE OF TRUTH for:
 *   - Plan pricing
 *   - Tier posting limits
 *   - Effective-tier resolution (expiry-aware)
 *   - Activation payload builder
 *
 * Import from here EVERYWHERE. Never inline tier/expiry logic in controllers.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { SubscriptionTier } from '../types';

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface PlanPrice {
  KES: number;
  USD: number;
}

export const PLAN_PRICES: Record<string, PlanPrice> = {
  pro:   { KES: 1500, USD: 12 },
  elite: { KES: 3500, USD: 28 },
};

// ── Posting limits ────────────────────────────────────────────────────────────

export const TIER_LIMITS: Record<string, number> = {
  free:      3,
  pro:       10,
  elite:     Infinity,
  unlimited: Infinity,
};

// ── Featured listing pricing ──────────────────────────────────────────────────
// Per-listing feature boost. Pro/Elite tiers receive free monthly credits.
// Additional features above the monthly allowance are charged at FEATURED_PRICE.

export const FEATURED_PRICE: PlanPrice = { KES: 500, USD: 4 };

/** Number of free featured-listing credits per billing month, by tier. */
export const TIER_FREE_FEATURES: Record<string, number> = {
  free:      0,
  pro:       1,
  elite:     5,
  unlimited: 5,
};

// ── Application limits ────────────────────────────────────────────────────────
// Free users are limited per calendar day to create scarcity and drive upgrades.
// Pro get 30/day (practical unlimited for real users). Elite has no limit.

/** Maximum job applications per calendar day (UTC), by tier. */
export const DAILY_APPLICATION_LIMITS: Record<string, number> = {
  free:      5,
  pro:       30,
  elite:     Infinity,
  unlimited: Infinity,
};

// ── Microtransaction pricing ──────────────────────────────────────────────────
// Pay-as-you-go pricing for individual feature unlocks. Users on any tier can
// purchase these without upgrading their subscription.

export interface MicrotransactionPrice {
  KES: number;
  USD: number;
  label: string;         // Shown in upgrade nudge copy
}

export const MICROTRANSACTION_PRICES: Record<string, MicrotransactionPrice> = {
  applicantUnlock:   { KES: 100,  USD: 0.80, label: 'Unlock applicant contact info' },
  applicationBoost:  { KES: 200,  USD: 1.60, label: 'Boost application to top' },
  profileHighlight:  { KES: 300,  USD: 2.40, label: 'Highlight your profile' },
  jobBoost:          { KES: 200,  USD: 1.60, label: 'Boost job visibility' },
};

// ── Free tier conversation limit ──────────────────────────────────────────────
// Free users may participate in up to this many concurrent conversations.
// Receiving messages is always allowed; sending requires Pro or higher.

export const FREE_CONVERSATION_LIMIT = 3;

// ── Priority score weights (ranking algorithm) ────────────────────────────────
// Added to boostScore when sorting jobs/tools/profiles.
// Stored as `tierScore` on the job/tool document at creation time so the sort
// can run in-memory without an extra Firestore read per listing.

export const TIER_SCORE_WEIGHTS: Record<string, number> = {
  free:      0,
  pro:       20,
  elite:     50,
  unlimited: 50,
};

// ── Visibility decay window ───────────────────────────────────────────────────
// After this many hours without a new application or update, a job's organic
// rank starts decaying. The `visibilityDecaysAt` timestamp surfaced in getJob
// is computed as updatedAt + VISIBILITY_DECAY_HOURS.

export const VISIBILITY_DECAY_HOURS = 48;

// ── Expiry-aware tier resolution ──────────────────────────────────────────────

/**
 * Returns the user's effective subscription tier.
 * Reverts to 'free' if the paid tier has expired.
 *
 * This is the AUTHORITATIVE check. All controllers MUST use this function
 * instead of reading `subscription.tier` directly.
 *
 * @param userData - Raw Firestore document data from the users collection.
 */
export function getEffectiveTier(userData: Record<string, any>): SubscriptionTier {
  const sub = userData?.subscription as
    | { tier?: string; expiresAt?: Timestamp | null }
    | undefined;

  const tier = (sub?.tier ?? 'free') as SubscriptionTier;

  // Free and unlimited tiers never expire
  if (tier === 'free' || tier === 'unlimited') return tier;

  // If no expiry stored, treat as free (data inconsistency — safe default)
  if (!sub?.expiresAt) return 'free';

  // Firestore Timestamp has .toMillis(); plain objects (from tests) have ._seconds
  const expiryMs =
    typeof (sub.expiresAt as any).toMillis === 'function'
      ? (sub.expiresAt as Timestamp).toMillis()
      : (sub.expiresAt as any)._seconds * 1000;

  return Date.now() <= expiryMs ? tier : 'free';
}

// ── Activation payload ────────────────────────────────────────────────────────

/**
 * Builds the Firestore update payload to activate a subscription tier.
 * Always sets expiresAt 30 days from now.
 *
 * Use inside a Firestore transaction only — never call bare .update() for
 * subscription activation because the user document must be verified to exist.
 */
export function buildSubscriptionActivation(tier: string): Record<string, unknown> {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  return {
    subscription: { tier, expiresAt },
    updatedAt: FieldValue.serverTimestamp(),
  };
}
