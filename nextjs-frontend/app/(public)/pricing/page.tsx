'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Zap, Crown, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Plan {
  id: 'free' | 'pro' | 'elite';
  label: string;
  tagline: string;
  priceKES: number;
  priceUSD: number;
  icon: React.ElementType;
  iconClass: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    label: 'Free',
    tagline: 'Get started at no cost',
    priceKES: 0,
    priceUSD: 0,
    icon: Star,
    iconClass: 'bg-gray-100 text-gray-600',
    features: [
      'Post up to 2 job listings',
      'Post up to 2 equipment listings',
      'Apply to unlimited jobs',
      'Basic profile page',
      'In-app messaging',
      'Community search & browse',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'pro',
    label: 'Premium',
    tagline: 'For active professionals',
    priceKES: 1500,
    priceUSD: 12,
    icon: Zap,
    iconClass: 'bg-infra-primary/10 text-infra-primary',
    features: [
      'Post up to 10 job listings',
      'Post up to 10 equipment listings',
      'Apply to unlimited jobs',
      'Featured profile badge',
      '1 featured listing per month',
      'Priority in search results',
      'In-app messaging',
      'View applicant contact info',
    ],
    cta: 'Go Premium',
    highlighted: true,
  },
  {
    id: 'elite',
    label: 'Gold',
    tagline: 'For power users & companies',
    priceKES: 3500,
    priceUSD: 28,
    icon: Crown,
    iconClass: 'bg-yellow-100 text-yellow-600',
    features: [
      'Unlimited job listings',
      'Unlimited equipment listings',
      'Apply to unlimited jobs',
      'Gold profile badge',
      '5 featured listings per month',
      'Top placement in search',
      'Advanced analytics',
      'In-app messaging',
      'View all applicant contact info',
      'Priority support',
    ],
    cta: 'Go Gold',
    highlighted: false,
  },
];

export default function PricingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');

  // Downgrade to free doesn't require payment
  const downgradeMutation = useMutation({
    mutationFn: () => api.put('/users/me/subscription', { tier: 'free' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('You\'re now on the Free plan.');
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to downgrade');
    },
  });

  // Use effectiveTier from API (computed server-side, expiry-aware) with fallback chain
  const currentTier = (profile as any)?.effectiveTier ?? profile?.subscription?.tier ?? profile?.subscriptionTier ?? 'free';
  const currentPlanId: 'free' | 'pro' | 'elite' =
    currentTier === 'unlimited' ? 'elite'
    : currentTier === 'elite' ? 'elite'
    : currentTier === 'pro' ? 'pro'
    : 'free';

  const handleSelect = (plan: Plan) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }
    if (plan.id === currentPlanId) return;

    // Downgrade to Free — no payment needed
    if (plan.id === 'free') {
      const confirmed = window.confirm(
        'Are you sure you want to downgrade to the Free plan? You will lose access to paid features at the end of your current billing period.'
      );
      if (!confirmed) return;
      downgradeMutation.mutate();
      return;
    }

    // Paid plans → go to checkout page
    router.push(`/checkout?plan=${plan.id}&currency=${currency}`);
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Choose the plan that fits your work. Upgrade or downgrade anytime.
        </p>

        {/* Currency toggle */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(['KES', 'USD'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                'rounded-lg px-5 py-1.5 text-sm font-medium transition-colors',
                currency === c
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlanId;
            const price = currency === 'KES' ? plan.priceKES : plan.priceUSD;
            const symbol = currency === 'KES' ? 'KES' : '$';

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-8 transition-shadow',
                  plan.highlighted
                    ? 'border-infra-primary shadow-2xl ring-2 ring-infra-primary'
                    : 'border-gray-200 shadow-sm hover:shadow-md',
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-infra-primary px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={cn('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl', plan.iconClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{plan.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {price === 0 ? (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">Free</span>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-sm font-semibold text-gray-600">{symbol}</span>
                      <span className="text-4xl font-extrabold text-gray-900">
                        {price.toLocaleString()}
                      </span>
                      <span className="mb-1 text-sm text-gray-500">/month</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-infra-primary" />
                      <span className="text-sm text-gray-600">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-center text-sm font-medium text-gray-500">
                    Current Plan
                  </div>
                ) : !user ? (
                  <Link href="/login?redirect=/pricing">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'primary' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    onClick={() => handleSelect(plan)}
                    disabled={downgradeMutation.isPending}
                  >
                    {downgradeMutation.isPending && plan.id === 'free'
                      ? 'Processing...'
                      : plan.cta}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / note */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. You can downgrade to Free at any time from this page or your account settings.',
              },
              {
                q: 'How is payment handled?',
                a: 'We accept M-Pesa and PayPal. You\'ll be prompted to pay after selecting a plan.',
              },
              {
                q: 'What counts as a "featured" listing?',
                a: 'Featured listings appear at the top of search results and are highlighted with a badge.',
              },
              {
                q: 'Is there a free trial for paid plans?',
                a: 'Paid plans come with a 7-day grace period — you can try before your first payment is charged.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-medium text-gray-800">{q}</p>
                <p className="mt-1 text-sm text-gray-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
