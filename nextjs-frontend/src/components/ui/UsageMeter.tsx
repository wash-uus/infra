'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Zap } from 'lucide-react';

interface UsageMeterProps {
  /** Number of listings currently active */
  used: number;
  /** Max allowed by the tier (pass Infinity for unlimited) */
  limit: number;
  /** e.g. "job" or "equipment" */
  label: string;
  /** Current tier name for the upgrade link copy */
  tier?: string;
  className?: string;
}

/**
 * Horizontal usage bar shown on dashboard / listing pages.
 * Turns amber at 80% and red at 100%.
 *
 * @example
 * <UsageMeter used={2} limit={10} label="job" tier="pro" />
 */
export default function UsageMeter({ used, limit, label, className }: UsageMeterProps) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isFull = !isUnlimited && used >= limit;
  const isWarning = !isUnlimited && pct >= 80 && !isFull;

  if (isUnlimited) {
    return (
      <div className={cn('rounded-xl border border-gray-100 bg-gray-50 px-4 py-3', className)}>
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{used}</span> active {label} listing{used !== 1 ? 's' : ''} &nbsp;·&nbsp;
          <span className="text-green-600 font-medium">Unlimited</span>
        </p>
      </div>
    );
  }

  return (
      <div className={cn('rounded-xl border bg-white px-4 py-3', isFull ? 'border-infra-error/30 bg-infra-error/5' : 'border-gray-200', className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 capitalize">
          {label} listings
        </p>
        <span className={cn(
          'text-sm font-semibold',
          isFull ? 'text-infra-error' : isWarning ? 'text-infra-secondary' : 'text-gray-900',
        )}>
          {used} / {limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isFull ? 'bg-infra-error' : isWarning ? 'bg-infra-secondary' : 'bg-infra-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Upgrade nudge */}
      {(isFull || isWarning) && (
        <div className="mt-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-infra-secondary shrink-0" />
          <p className="text-xs text-gray-500">
            {isFull
              ? <><Link href="/pricing" className="font-medium text-infra-secondary hover:underline">Upgrade</Link> to post more — limit reached.</>
              : <>Almost full. <Link href="/pricing" className="font-medium text-infra-secondary hover:underline">Upgrade</Link> for more capacity.</>
            }
          </p>
        </div>
      )}
    </div>
  );
}
