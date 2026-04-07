'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface InfraLogoProps {
  /** 'full' = icon + wordmark, 'icon' = icon only, 'wordmark' = text only */
  variant?: 'full' | 'icon' | 'wordmark';
  /** Size controls the icon height; wordmark scales proportionally */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** Invert colours for use on dark / coloured backgrounds */
  inverted?: boolean;
}

const SIZE_MAP = {
  xs:  { icon: 24, text: 'text-sm'  },
  sm:  { icon: 28, text: 'text-base' },
  md:  { icon: 36, text: 'text-xl'  },
  lg:  { icon: 44, text: 'text-2xl' },
  xl:  { icon: 56, text: 'text-3xl' },
  '2xl': { icon: 72, text: 'text-4xl' },
};

export default function InfraLogo({
  variant = 'full',
  size = 'md',
  className,
  inverted = false,
}: InfraLogoProps) {
  const { icon: h, text: textSize } = SIZE_MAP[size];
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const showIcon = variant === 'full' || variant === 'icon';
  const showText = variant === 'full' || variant === 'wordmark';

  // Reserve the same outer span dimensions on the server; children render only after hydration.
  // This guarantees server HTML always matches client HTML regardless of cached JS bundles.
  return (
    <span
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
      style={!mounted && showIcon ? { minWidth: SIZE_MAP[size].icon, minHeight: SIZE_MAP[size].icon } : undefined}
    >
      {mounted && showIcon && (
        <Image
          src="/infrasells-logo.jpeg"
          alt="InfraSells logo"
          width={h}
          height={h}
          className="object-contain"
          style={{ opacity: inverted ? 0.9 : 1 }}
          priority
        />
      )}

      {mounted && showText && (
        <span
          className={cn(
            textSize,
            'font-extrabold tracking-tight leading-none',
            inverted
              ? 'text-white'
              : 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent',
          )}
          style={{ letterSpacing: '-0.02em' }}
        >
          InfraSells
        </span>
      )}
    </span>
  );
}
