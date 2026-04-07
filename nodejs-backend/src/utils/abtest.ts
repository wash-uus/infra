/**
 * A/B Test Utility — Server-side experiment assignment
 *
 * Supports:
 *   - Deterministic user assignment (same user always gets same bucket)
 *   - Multi-variant support (not just A/B — can do A/B/C/D)
 *   - Persistent assignment logged to Firestore for analytics
 *   - Dynamic pricing experiments (e.g. Pro: KES 1499 vs 1999)
 *
 * Usage:
 *   const variant = await assignABTest(uid, 'pro_price_test', ['control', 'price_1999']);
 *   // Returns 'control' or 'price_1999' deterministically for this uid
 */

import { db, col } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from './logger';

// ── Active experiments ────────────────────────────────────────────────────────
// Add new experiments here. Each experiment defines its variants and traffic split.
// Traffic splits must sum to 1.0.

export interface ABTestConfig {
  name: string;
  variants: string[];
  trafficSplit: number[]; // must sum to 1.0, one weight per variant
  status: 'active' | 'paused' | 'concluded';
}

export const AB_TESTS: Record<string, ABTestConfig> = {
  // Pricing experiment: Pro tier KES 1499 vs KES 1999
  pro_price_test: {
    name: 'pro_price_test',
    variants: ['control_1500', 'price_1999'],
    trafficSplit: [0.5, 0.5],
    status: 'active',
  },

  // Free-to-Pro upgrade CTA placement
  upgrade_cta_position: {
    name: 'upgrade_cta_position',
    variants: ['top_banner', 'inline_card', 'exit_intent'],
    trafficSplit: [0.33, 0.33, 0.34],
    status: 'active',
  },

  // Bundle discount: show boost+featured bundle vs individual pricing
  bundle_discount_display: {
    name: 'bundle_discount_display',
    variants: ['individual', 'bundle_highlight'],
    trafficSplit: [0.5, 0.5],
    status: 'active',
  },
};

// ── Deterministic assignment via FNV-1a hash ─────────────────────────────────
// Same uid + experiment name always produces the same bucket (no DB read needed
// for assignment itself — DB is only for analytics persistence).

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // unsigned 32-bit multiply
  }
  return hash;
}

function bucketUser(uid: string, testName: string, trafficSplit: number[]): number {
  const hash = fnv1aHash(`${uid}:${testName}`);
  const normalized = (hash % 10_000) / 10_000; // 0.0000–0.9999

  let cumulative = 0;
  for (let i = 0; i < trafficSplit.length; i++) {
    cumulative += trafficSplit[i];
    if (normalized < cumulative) return i;
  }
  return trafficSplit.length - 1; // fallback to last bucket
}

// ── Get or create AB test assignment ─────────────────────────────────────────

export async function assignABTest(
  uid: string,
  testName: string,
): Promise<{ variant: string; isNew: boolean }> {
  const config = AB_TESTS[testName];
  if (!config || config.status !== 'active') {
    // Return control variant for inactive/unknown tests
    return { variant: config?.variants[0] ?? 'control', isNew: false };
  }

  const docId  = `${uid}_${testName}`;
  const docRef = col.abTestAssignments.doc(docId);

  // Check for existing assignment
  const existing = await docRef.get();
  if (existing.exists) {
    return { variant: (existing.data() as any).variant, isNew: false };
  }

  // Deterministic bucket assignment
  const bucketIdx = bucketUser(uid, testName, config.trafficSplit);
  const variant   = config.variants[bucketIdx];

  // Persist assignment (fire-and-forget — don't block response)
  docRef.set({
    uid,
    testName,
    variant,
    assignedAt: FieldValue.serverTimestamp(),
  }).catch((err) => {
    logger.warn('AB test assignment persistence failed', { uid, testName, error: err.message });
  });

  return { variant, isNew: true };
}

// ── Track conversion event ────────────────────────────────────────────────────

export async function trackABConversion(
  uid: string,
  testName: string,
  eventName: string,
  value?: number,
): Promise<void> {
  const docId = `${uid}_${testName}`;
  const assignment = await col.abTestAssignments.doc(docId).get();
  if (!assignment.exists) return;

  const { variant } = assignment.data() as any;

  await db.collection('abTestConversions').add({
    uid,
    testName,
    variant,
    eventName,
    value: value ?? null,
    convertedAt: FieldValue.serverTimestamp(),
  });

  logger.info('AB test conversion recorded', { uid, testName, variant, eventName, value });
}

// ── Get current prices (respects A/B test variants) ──────────────────────────

export interface PlanPrices {
  pro:   { KES: number; USD: number };
  elite: { KES: number; USD: number };
}

export async function getPlanPricesForUser(uid: string): Promise<PlanPrices> {
  const { variant } = await assignABTest(uid, 'pro_price_test');

  const proKES = variant === 'price_1999' ? 1999 : 1500;
  const proUSD = variant === 'price_1999' ? 16   : 12;

  return {
    pro:   { KES: proKES,  USD: proUSD  },
    elite: { KES: 3500,   USD: 28      }, // Elite price is not being tested
  };
}
