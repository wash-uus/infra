import { cn } from '@/lib/utils';
import { Crown, Zap } from 'lucide-react';

interface TierBadgeProps {
  tier: 'free' | 'pro' | 'elite' | 'unlimited' | string;
  className?: string;
  showIcon?: boolean;
}

const TIER_CONFIG: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  free:      { label: 'Free',      className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  pro:       { label: 'Pro',       className: 'bg-infra-primary text-white ring-1 ring-infra-primary/20', icon: Zap },
  elite:     { label: 'Elite',     className: 'bg-infra-accent text-black ring-1 ring-infra-accent/30 shadow-glow-gold', icon: Crown },
  unlimited: { label: 'Unlimited', className: 'bg-infra-primary text-white ring-1 ring-infra-primary/20', icon: Crown },
};

export default function TierBadge({ tier, className, showIcon = true }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.free;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className,
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
