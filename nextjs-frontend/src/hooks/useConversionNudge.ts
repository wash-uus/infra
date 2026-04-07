'use client';

/**
 * useConversionNudge
 *
 * Manages conversion nudge display logic.
 * Tracks micro-transaction usage, detects limit hits, and surfaces
 * the appropriate nudge trigger at the right moment.
 *
 * Usage:
 *   const { nudge, triggerNudge, clearNudge } = useConversionNudge();
 *   // On API 403:
 *   if (error.code === 'UPGRADE_REQUIRED') triggerNudge('LIMIT_HIT');
 *   // After 3 paid feature unlocks:
 *   if (unlockedCount >= 3) triggerNudge('UNLOCK_THREE', { count: unlockedCount });
 */

import { useState, useCallback, useRef } from 'react';
import type { NudgeTrigger } from '@/components/ui/ConversionNudge';

interface NudgeState {
  trigger: NudgeTrigger;
  context?: Record<string, unknown>;
}

const COOLDOWN_MS = 3 * 60 * 1_000; // 3 minute cooldown between nudges

export function useConversionNudge() {
  const [nudge, setNudge] = useState<NudgeState | null>(null);
  const lastShown = useRef<number>(0);

  const triggerNudge = useCallback((
    trigger: NudgeTrigger,
    context?: Record<string, unknown>,
  ) => {
    const now = Date.now();
    // Respect cooldown — don't spam the user
    if (now - lastShown.current < COOLDOWN_MS) return;
    lastShown.current = now;
    setNudge({ trigger, context });
  }, []);

  const clearNudge = useCallback(() => {
    setNudge(null);
  }, []);

  return { nudge, triggerNudge, clearNudge };
}
