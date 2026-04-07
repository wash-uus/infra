/**
 * Feature Flags Service
 *
 * Reads/writes feature flags from Firestore `config/features`.
 * Allows superadmins to toggle monetization features without redeploying.
 *
 * Cache TTL: 30 seconds — flag changes propagate quickly without hammering Firestore.
 *
 * Firestore document shape:
 * {
 *   applicationLimits:  true,   // enforce per-tier daily application limits
 *   contactUnlock:      true,   // free employers must pay to reveal applicants
 *   messagingGate:      true,   // free users get limited message sends
 *   boosts:             true,   // application + job boosts available
 *   featuredListings:   true,   // featured job/tool listings available
 *   referralSystem:     true,   // referral codes + invite links active
 *   conversionTracking: true,   // write conversionEvents to Firestore
 *   updatedAt: Timestamp,
 *   updatedBy: string
 * }
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import { cached, invalidate } from '../utils/cache';

const FLAGS_DOC  = db.collection('config').doc('features');
const CACHE_KEY  = 'config:features';
const CACHE_TTL  = 30; // seconds

// ── Defaults — all ON at launch ───────────────────────────────────────────────
export const DEFAULT_FLAGS = {
  applicationLimits:  true,
  contactUnlock:      true,
  messagingGate:      true,
  boosts:             true,
  featuredListings:   true,
  referralSystem:     true,
  conversionTracking: true,
} as const;

export type FeatureFlags = typeof DEFAULT_FLAGS;
export type FeatureFlag  = keyof FeatureFlags;

/**
 * Fetch current feature flags.
 * Falls back to DEFAULT_FLAGS if the Firestore doc hasn't been created yet.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  return cached(CACHE_KEY, CACHE_TTL, async () => {
    try {
      const snap = await FLAGS_DOC.get();
      if (!snap.exists) return { ...DEFAULT_FLAGS };
      const data = snap.data() ?? {};
      // Merge — only keep known flag keys, fall back to defaults for any missing
      return Object.fromEntries(
        (Object.keys(DEFAULT_FLAGS) as FeatureFlag[]).map((k) => [
          k,
          k in data ? Boolean(data[k]) : DEFAULT_FLAGS[k],
        ]),
      ) as FeatureFlags;
    } catch (err: any) {
      logger.warn('FeatureFlags: failed to load from Firestore', { error: err.message });
      return { ...DEFAULT_FLAGS };
    }
  });
}

/**
 * Check a single flag. Convenience wrapper — returns DEFAULT if Firestore fails.
 */
export async function isEnabled(flag: FeatureFlag): Promise<boolean> {
  try {
    const flags = await getFeatureFlags();
    return flags[flag];
  } catch {
    return DEFAULT_FLAGS[flag];
  }
}

/**
 * Patch one or more feature flags.
 * Writes to Firestore and busts the cache so next read reflects the change.
 */
export async function setFeatureFlags(
  patch: Partial<FeatureFlags>,
  adminId: string,
): Promise<void> {
  // Only allow patching known flag keys
  const safe = Object.fromEntries(
    Object.entries(patch).filter(([k]) => k in DEFAULT_FLAGS),
  );
  await FLAGS_DOC.set(
    { ...safe, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminId },
    { merge: true },
  );
  await invalidate(CACHE_KEY);
  logger.info('FeatureFlags updated', { patch: safe, adminId });
}
