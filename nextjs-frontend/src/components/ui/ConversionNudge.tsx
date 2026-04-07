'use client';

/**
 * ConversionNudge
 *
 * Context-aware, non-blocking upgrade prompts shown at high-intent moments:
 *   - LIMIT_HIT     → user hits their free-tier listing/application cap
 *   - UNLOCK_THREE  → user has unlocked ≥ 3 paid features → suggest subscription
 *   - BLOCKED_REPLY → user tries to reply to a message but can't (tier restriction)
 *
 * The nudge slides in from the bottom-right corner, auto-dismisses after 12s,
 * and fires a conversion event for analytics.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Zap, Crown, MessageCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NudgeTrigger = 'LIMIT_HIT' | 'UNLOCK_THREE' | 'BLOCKED_REPLY' | 'FEATURE_PREVIEW';

export interface ConversionNudgeProps {
  trigger: NudgeTrigger;
  currentTier?: string;
  /** Context data: e.g. { feature: 'jobBoost', count: 3 } */
  context?: Record<string, unknown>;
  onDismiss?: () => void;
  onConvert?: () => void;
  /** Auto-dismiss after this many ms (default 12000) */
  autoDismissMs?: number;
}

// ── Nudge content map ─────────────────────────────────────────────────────────

const NUDGE_CONTENT: Record<NudgeTrigger, {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  body: (ctx: Record<string, unknown>, tier: string) => string;
  cta: string;
  href: (tier: string) => string;
}> = {
  LIMIT_HIT: {
    icon: TrendingUp,
    iconBg: 'bg-infra-secondary/10',
    title: 'You\'ve hit your limit',
    body: (_ctx, tier) =>
      tier === 'free'
        ? 'Upgrade to Pro to post unlimited listings and get featured placements.'
        : 'Upgrade to Elite for unlimited everything, priority support, and top search placement.',
    cta: 'Upgrade now — from KES 999/mo',
    href: () => '/pricing',
  },
  UNLOCK_THREE: {
    icon: Zap,
    iconBg: 'bg-infra-primary/10',
    title: 'You\'re getting serious 🚀',
    body: (_ctx, tier) =>
      tier === 'free'
        ? 'You\'ve used 3 paid features. A Pro subscription costs less than buying them individually.'
        : 'You\'re close to unlocking everything Elite has to offer.',
    cta: 'See subscription plans',
    href: () => '/pricing',
  },
  BLOCKED_REPLY: {
    icon: MessageCircle,
    iconBg: 'bg-blue-50',
    title: 'Unlock direct messaging',
    body: () =>
      'Upgrade to send unlimited direct messages to clients and professionals.',
    cta: 'Upgrade to unlock messaging',
    href: () => '/pricing?feature=messaging',
  },
  FEATURE_PREVIEW: {
    icon: Crown,
    iconBg: 'bg-infra-accent/10',
    title: 'Unlock this feature',
    body: (ctx) =>
      `"${ctx.featureName ?? 'This feature'}" is available on Pro and above.`,
    cta: 'View plans',
    href: () => '/pricing',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversionNudge({
  trigger,
  currentTier = 'free',
  context = {},
  onDismiss,
  onConvert,
  autoDismissMs = 12_000,
}: ConversionNudgeProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const nudge = NUDGE_CONTENT[trigger];

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const handleCta = () => {
    // Track conversion intent in analytics (fire-and-forget)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion_nudge_click', {
        trigger,
        currentTier,
        ...context,
      });
    }
    onConvert?.();
    router.push(nudge.href(currentTier));
  };

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(dismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [dismiss, autoDismissMs]);

  if (!visible) return null;

  const Icon = nudge.icon;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Upgrade suggestion"
      className={cn(
        'fixed bottom-6 right-6 z-50 w-80 rounded-2xl bg-white shadow-2xl border border-gray-100',
        'transition-all duration-300',
        leaving ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0',
      )}
    >
      {/* Progress bar — shows remaining auto-dismiss time */}
      <div
        className="h-1 rounded-t-2xl bg-infra-secondary"
        style={{ animation: `shrink ${autoDismissMs}ms linear forwards` }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className={cn('p-2 rounded-xl', nudge.iconBg)}>
              <Icon className="w-4 h-4 text-infra-secondary" />
            </span>
            <p className="font-semibold text-infra-primary text-sm leading-tight">
              {nudge.title}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-gray-600 text-xs leading-relaxed mb-3 pl-11">
          {nudge.body(context, currentTier)}
        </p>

        {/* CTA */}
        <button
          onClick={handleCta}
          className="w-full text-xs font-semibold py-2 px-4 rounded-xl bg-infra-secondary text-white hover:bg-infra-secondary/90 transition-colors"
        >
          {nudge.cta}
        </button>
      </div>

      {/* Keyframe for progress bar */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
