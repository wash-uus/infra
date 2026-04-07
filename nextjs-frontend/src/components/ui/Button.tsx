import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cta' | 'elite' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants: Record<string, string> = {
  /** Default action — Deep Engineering Blue */
  primary:
    'bg-infra-primary text-white shadow-md hover:bg-infra-primary/90 active:scale-[0.98] focus-visible:ring-infra-primary',
  /** Money actions — Post Job, Apply, Upgrade, Pay */
  cta:
    'bg-infra-secondary text-white shadow-md shadow-infra-secondary/25 hover:brightness-105 hover:scale-105 active:scale-[0.98] focus-visible:ring-infra-secondary',
  /** Elite upsell — Premium features */
  elite:
    'bg-infra-accent text-black shadow-md shadow-infra-accent/25 hover:brightness-105 hover:scale-105 active:scale-[0.98] focus-visible:ring-infra-accent',
  /** Subtle secondary */
  secondary:
    'bg-infra-primary/10 text-infra-primary hover:bg-infra-primary/15 focus-visible:ring-infra-primary',
  /** Outlined */
  outline:
    'border border-gray-200 bg-white text-infra-primary shadow-sm hover:border-infra-primary/40 hover:bg-infra-background focus-visible:ring-infra-primary',
  /** Ghost */
  ghost:
    'text-infra-neutral hover:bg-infra-background hover:text-infra-primary focus-visible:ring-infra-primary',
  /** Destructive */
  danger:
    'bg-infra-error text-white shadow-md shadow-infra-error/20 hover:brightness-95 focus-visible:ring-infra-error',
  /** Confirmations */
  success:
    'bg-infra-success text-white shadow-md shadow-infra-success/20 hover:brightness-95 focus-visible:ring-infra-success',
};

const sizes: Record<string, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
