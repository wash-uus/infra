import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
           | 'pro' | 'elite' | 'featured' | 'boosted';
}

const variants: Record<string, string> = {
  default:  'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  success:  'bg-infra-success/10 text-infra-success ring-1 ring-infra-success/20',
  warning:  'bg-infra-accent/10 text-infra-accent ring-1 ring-infra-accent/20',
  danger:   'bg-infra-error/10 text-infra-error ring-1 ring-infra-error/20',
  info:     'bg-infra-primary/10 text-infra-primary ring-1 ring-infra-primary/20',
  outline:  'bg-transparent text-gray-600 ring-1 ring-gray-200',
  // Subscription tiers
  pro:      'bg-infra-primary text-white ring-1 ring-infra-primary/20',
  elite:    'bg-infra-accent text-black ring-1 ring-infra-accent/30 shadow-glow-gold',
  // Marketplace listing badges
  featured: 'bg-infra-secondary text-white ring-1 ring-infra-secondary/20',
  boosted:  'bg-infra-secondary/10 text-infra-secondary ring-1 ring-infra-secondary/20',
};

export const Badge = function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
};

export default Badge;
