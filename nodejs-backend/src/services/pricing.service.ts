/**
 * Dynamic Pricing Service
 *
 * Reads pricing configuration from Firestore `config/pricing`.
 * This allows superadmins to update prices without redeploying.
 *
 * Config document shape (all amounts in KES unless otherwise noted):
 * {
 *   plans: {
 *     pro:       { monthly: 999,  annual: 9990  },
 *     elite:     { monthly: 2499, annual: 24990 },
 *     unlimited: { monthly: 4999, annual: 49990 }
 *   },
 *   features: {
 *     jobBoost:        { price: 199, currency: 'KES' },
 *     applicationBoost:{ price: 99,  currency: 'KES' },
 *     featuredJob:     { price: 499, currency: 'KES', durationDays: 7 },
 *     featuredTool:    { price: 299, currency: 'KES', durationDays: 7 },
 *     profileHighlight:{ price: 149, currency: 'KES' },
 *     directMessage:   { price: 29,  currency: 'KES' }
 *   },
 *   regionalMultipliers: {
 *     KE: 1.0,
 *     NG: 0.8,
 *     ZA: 1.2
 *   },
 *   updatedAt: Timestamp,
 *   updatedBy: string (adminId)
 * }
 *
 * Cache TTL: 60 seconds in-process (overridden by Redis if available).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import { cached, invalidate } from '../utils/cache';

const PRICING_DOC = db.collection('config').doc('pricing');
const CACHE_KEY   = 'config:pricing';
const CACHE_TTL   = 60; // seconds

// ── Default prices (fallback when Firestore config is missing) ────────────────
export const DEFAULT_PRICING = {
  plans: {
    pro:       { monthly: 999,  annual: 9990  },
    elite:     { monthly: 2499, annual: 24990 },
    unlimited: { monthly: 4999, annual: 49990 },
  },
  features: {
    jobBoost:         { price: 199, currency: 'KES' },
    applicationBoost: { price: 99,  currency: 'KES' },
    featuredJob:      { price: 499, currency: 'KES', durationDays: 7 },
    featuredTool:     { price: 299, currency: 'KES', durationDays: 7 },
    profileHighlight: { price: 149, currency: 'KES' },
    directMessage:    { price: 29,  currency: 'KES' },
  },
  regionalMultipliers: {
    KE: 1.0,
    NG: 0.8,
    ZA: 1.2,
  } as Record<string, number>,
};

export type PricingConfig = typeof DEFAULT_PRICING;

/**
 * Fetch the current pricing config.
 * Cached for 60s — superadmin updates take effect within 1 minute.
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  return cached(CACHE_KEY, CACHE_TTL, async () => {
    try {
      const snap = await PRICING_DOC.get();
      if (!snap.exists) return DEFAULT_PRICING;
      return { ...DEFAULT_PRICING, ...snap.data() } as PricingConfig;
    } catch (err: any) {
      logger.warn('Dynamic pricing: failed to load config', { error: err.message });
      return DEFAULT_PRICING;
    }
  });
}

/**
 * Get the price for a specific feature, applying optional regional multiplier.
 */
export async function getFeaturePrice(
  featureKey: keyof PricingConfig['features'],
  countryCode?: string,
): Promise<{ price: number; currency: string }> {
  const config = await getPricingConfig();
  const feature = config.features[featureKey] ?? { price: 0, currency: 'KES' };

  const multiplier = countryCode
    ? (config.regionalMultipliers[countryCode.toUpperCase()] ?? 1.0)
    : 1.0;

  return {
    price:    Math.round(feature.price * multiplier),
    currency: feature.currency,
  };
}

/**
 * Get subscription plan price.
 */
export async function getPlanPrice(
  tier: 'pro' | 'elite' | 'unlimited',
  interval: 'monthly' | 'annual',
  countryCode?: string,
): Promise<number> {
  const config = await getPricingConfig();
  const plan = config.plans[tier];
  if (!plan) return 0;

  const base = plan[interval];
  const multiplier = countryCode
    ? (config.regionalMultipliers[countryCode.toUpperCase()] ?? 1.0)
    : 1.0;

  return Math.round(base * multiplier);
}

/**
 * Update pricing configuration (superadmin only).
 * Accepts a partial update — only provided keys are merged.
 */
export async function updatePricingConfig(
  patch: Partial<PricingConfig>,
  adminId: string,
): Promise<void> {
  await PRICING_DOC.set(
    { ...patch, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminId },
    { merge: true },
  );

  // Bust cache so new prices take effect immediately
  await invalidate(CACHE_KEY).catch(() => { /* non-fatal */ });

  logger.info('Dynamic pricing: config updated', { adminId, keys: Object.keys(patch) });
}
