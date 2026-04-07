'use client';

import { useRouter } from 'next/navigation';
import { X, Zap, Crown, Lock } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';

export interface UpgradeModalProps {
  /** What the user was trying to do when they hit the limit */
  action?: string;
  /** Current tier, so we know what to upsell to */
  currentTier?: string;
  /** Error code from API: 'UPGRADE_REQUIRED' | 'CREDITS_EXHAUSTED' | generic */
  code?: string;
  /** Custom message override from API response */
  message?: string;
  onClose: () => void;
}

const UPGRADE_TARGETS: Record<string, { label: string; tier: string; icon: React.ElementType; iconClass: string; bullets: string[] }> = {
  free: {
    label: 'Pro',
    tier: 'pro',
    icon: Zap,
    iconClass: 'bg-infra-primary/10 text-infra-primary',
    bullets: [
      'Post up to 10 listings',
      '1 free featured listing per month',
      'Priority in search results',
      'View applicant contact info',
      'Unlimited messaging',
    ],
  },
  pro: {
    label: 'Elite',
    tier: 'elite',
    icon: Crown,
    iconClass: 'bg-infra-accent/10 text-infra-accent',
    bullets: [
      'Unlimited listings',
      '5 featured listings per month',
      'Top placement in all searches',
      'Advanced analytics dashboard',
      'Priority support',
      'Elite badge on profile & listings',
    ],
  },
};

/**
 * Full-page overlay shown when the API returns a 403 with an upgrade requirement.
 * Renders the relevant upsell pitch and routes to /pricing or /checkout.
 */
export default function UpgradeModal({
  action,
  currentTier = 'free',
  code,
  message,
  onClose,
}: UpgradeModalProps) {
  const router = useRouter();
  const target = currentTier === 'pro' ? UPGRADE_TARGETS.pro : UPGRADE_TARGETS.free;
  const Icon = target.icon;

  const defaultMessage =
    code === 'CREDITS_EXHAUSTED'
      ? `You've used all your free featured listing credits for this month.`
      : code === 'UPGRADE_REQUIRED'
      ? `This feature requires a ${target.label} plan.`
      : `You've reached the limit for your current plan.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Lock icon */}
        <div className="mb-5 flex flex-col items-center text-center">
          <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-2xl', target.iconClass)}>
            <Lock className="h-7 w-7" />
          </div>
          <h2 id="upgrade-modal-title" className="text-xl font-bold text-gray-900">
            Upgrade to {target.label}
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xs">
            {message ?? defaultMessage}
            {action && ` Upgrade now to ${action}.`}
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-6 rounded-xl bg-infra-background border border-gray-100 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {target.label} includes
          </h3>
          <ul className="space-y-2">
            {target.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-infra-neutral">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-infra-success" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button
            variant={target.tier === 'elite' ? 'elite' : 'cta'}
            className="flex-1"
            onClick={() => {
              onClose();
              router.push(`/checkout?plan=${target.tier}&currency=KES`);
            }}
          >
            Upgrade to {target.label}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          View all plans on the{' '}
          <button
            className="underline hover:text-gray-600 transition-colors"
            onClick={() => { onClose(); router.push('/pricing'); }}
          >
            pricing page
          </button>
        </p>
      </div>
    </div>
  );
}
