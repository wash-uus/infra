'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Shield,
  Zap,
  Crown,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Plan metadata (must match pricing page + backend) ─────────────────────────

interface PlanMeta {
  label: string;
  icon: React.ElementType;
  iconClass: string;
  priceKES: number;
  priceUSD: number;
}

const PLANS: Record<string, PlanMeta> = {
  pro: {
    label: 'Premium',
    icon: Zap,
    iconClass: 'bg-infra-primary/10 text-infra-primary',
    priceKES: 1500,
    priceUSD: 12,
  },
  elite: {
    label: 'Gold',
    icon: Crown,
    iconClass: 'bg-yellow-100 text-yellow-600',
    priceKES: 3500,
    priceUSD: 28,
  },
};

type PaymentMethod = 'mpesa' | 'paypal' | 'stripe';
type CheckoutStep = 'method' | 'pay' | 'processing' | 'success';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const plan = searchParams.get('plan') as string;
  const currencyParam = (searchParams.get('currency') ?? 'KES') as 'KES' | 'USD';

  const planMeta = PLANS[plan];

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<CheckoutStep>('method');
  const [phone, setPhone] = useState('');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if invalid plan or not logged in
  useEffect(() => {
    if (!user) {
      router.replace(`/login?redirect=/checkout?plan=${plan}&currency=${currencyParam}`);
      return;
    }
    if (!planMeta) {
      router.replace('/pricing');
    }
  }, [user, planMeta, plan, currencyParam, router]);

  const price = currencyParam === 'KES' ? planMeta?.priceKES : planMeta?.priceUSD;
  const symbol = currencyParam === 'KES' ? 'KES' : '$';

  // ── Step 1: Initiate subscription ──────────────────────────────────────────

  const initiateMutation = useMutation({
    mutationFn: async (paymentMethod: PaymentMethod) => {
      const res = await api.post('/subscriptions/initiate', {
        tier: plan,
        currency: currencyParam,
        paymentMethod,
      });
      return res.data.data as { subscriptionId: string };
    },
    onSuccess: (data) => {
      setSubscriptionId(data.subscriptionId);
      setStep('pay');
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to initiate payment');
    },
  });

  // ── Stripe: Create session & redirect ───────────────────────────────────

  const stripeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/subscriptions/stripe/create-session', {
        tier: plan,
        currency: 'USD',
      });
      return res.data.data as { sessionId: string; url: string };
    },
    onSuccess: (data) => {
      // Redirect to Stripe-hosted Checkout page
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to start Stripe checkout');
    },
  });

  const handleSelectMethod = (m: PaymentMethod) => {
    if (m === 'stripe') {
      setMethod('stripe');
      stripeMutation.mutate();
      return;
    }
    setMethod(m);
    initiateMutation.mutate(m);
  };

  // ── M-Pesa: STK Push ──────────────────────────────────────────────────────

  const mpesaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/subscriptions/mpesa/stk-push', {
        subscriptionId,
        phone,
      });
      return res.data;
    },
    onSuccess: () => {
      setStep('processing');
      startPolling();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to send M-Pesa prompt');
    },
  });

  // Poll for M-Pesa callback confirmation
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/subscriptions/status/${subscriptionId}`);
        const { status } = res.data.data;
        if (status === 'completed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          setStep('success');
        } else if (status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          toast.error('Payment was not successful. Please try again.');
          setStep('pay');
        }
      } catch {
        // ignore polling errors
      }
      if (attempts >= 60) {
        // Stop after ~2 minutes
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast.error('Payment confirmation timed out. Check your M-Pesa messages and refresh.');
        setStep('pay');
      }
    }, 2000);
  }, [subscriptionId, queryClient]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── PayPal: Create & capture ──────────────────────────────────────────────

  const paypalMutation = useMutation({
    mutationFn: async () => {
      // 1. Create PayPal order
      const createRes = await api.post('/subscriptions/paypal/create-order', {
        subscriptionId,
      });
      const order = createRes.data.data;

      // 2. Open PayPal approval URL in current window
      const approvalLink = order.links?.find(
        (l: { rel: string; href: string }) => l.rel === 'approve',
      );
      if (!approvalLink) throw new Error('PayPal approval URL not found');

      // Store subscription ID for the return
      sessionStorage.setItem('infra_paypal_sub', subscriptionId!);
      sessionStorage.setItem('infra_paypal_order', order.id);

      // Redirect to PayPal
      window.location.href = approvalLink.href;
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to create PayPal order');
    },
  });

  // Handle PayPal return (when user comes back from PayPal)
  useEffect(() => {
    const storedSubId = sessionStorage.getItem('infra_paypal_sub');
    const storedOrderId = sessionStorage.getItem('infra_paypal_order');

    if (storedSubId && storedOrderId && !subscriptionId) {
      sessionStorage.removeItem('infra_paypal_sub');
      sessionStorage.removeItem('infra_paypal_order');
      setSubscriptionId(storedSubId);
      setMethod('paypal');
      setStep('processing');

      // Capture the order
      api
        .post('/subscriptions/paypal/capture-order', {
          subscriptionId: storedSubId,
          orderId: storedOrderId,
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          setStep('success');
        })
        .catch((err: any) => {
          toast.error(err?.message ?? 'PayPal payment capture failed');
          setStep('method');
        });
    }
  }, [subscriptionId, queryClient]);

  if (!planMeta) return null;

  const Icon = planMeta.icon;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      {/* Back */}
      <button
        onClick={() => (step === 'success' ? router.push('/dashboard') : router.push('/pricing'))}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === 'success' ? 'Go to Dashboard' : 'Back to Pricing'}
      </button>

      {/* Order summary card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-6">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', planMeta.iconClass)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              Upgrade to {planMeta.label}
            </h1>
            <p className="text-sm text-gray-500">Monthly subscription</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900">
              {symbol} {price?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">/month</p>
          </div>
        </div>

        {/* ── Step: Choose method ───────────────────────────────────────── */}
        {step === 'method' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Select Payment Method
            </h2>

            <button
              onClick={() => handleSelectMethod('mpesa')}
              disabled={initiateMutation.isPending}
              className={cn(
                'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                'hover:border-infra-primary hover:bg-infra-primary/5',
                initiateMutation.isPending && initiateMutation.variables === 'mpesa'
                  ? 'border-infra-primary bg-infra-primary/5'
                  : 'border-gray-200',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Smartphone className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">M-Pesa</p>
                <p className="text-sm text-gray-500">Pay via Safaricom M-Pesa</p>
              </div>
              {initiateMutation.isPending && initiateMutation.variables === 'mpesa' && (
                <Loader2 className="h-5 w-5 animate-spin text-infra-primary" />
              )}
            </button>

            <button
              onClick={() => handleSelectMethod('paypal')}
              disabled={initiateMutation.isPending}
              className={cn(
                'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                'hover:border-blue-500 hover:bg-blue-50',
                initiateMutation.isPending && initiateMutation.variables === 'paypal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">PayPal</p>
                <p className="text-sm text-gray-500">Pay with PayPal or card</p>
              </div>
              {initiateMutation.isPending && initiateMutation.variables === 'paypal' && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </button>

            <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Payments are secure and encrypted</span>
            </div>

            <button
              onClick={() => handleSelectMethod('stripe')}
              disabled={stripeMutation.isPending}
              className={cn(
                'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                'hover:border-purple-500 hover:bg-purple-50',
                stripeMutation.isPending
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <CreditCard className="h-5 w-5 text-purple-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Credit / Debit Card</p>
                <p className="text-sm text-gray-500">Pay with card via Stripe (Visa, Mastercard)</p>
              </div>
              {stripeMutation.isPending && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              )}
            </button>
          </div>
        )}

        {/* ── Step: M-Pesa Phone Entry ─────────────────────────────────── */}
        {step === 'pay' && method === 'mpesa' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Enter M-Pesa Phone Number
            </h2>
            <p className="text-sm text-gray-500">
              You will receive an STK push on your phone. Enter your M-Pesa PIN to complete payment.
            </p>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678 or 254712345678"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-infra-primary focus:ring-2 focus:ring-infra-primary/20 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('method');
                  setSubscriptionId(null);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => mpesaMutation.mutate()}
                disabled={!phone || mpesaMutation.isPending}
                className="flex-1"
              >
                {mpesaMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  `Pay ${symbol} ${price?.toLocaleString()}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: PayPal redirect ────────────────────────────────────── */}
        {step === 'pay' && method === 'paypal' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              PayPal Payment
            </h2>
            <p className="text-sm text-gray-500">
              You will be redirected to PayPal to complete your payment securely.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('method');
                  setSubscriptionId(null);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => paypalMutation.mutate()}
                disabled={paypalMutation.isPending}
                className="flex-1"
              >
                {paypalMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </span>
                ) : (
                  'Continue to PayPal'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Processing ─────────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-infra-primary mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Processing Payment</h2>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              {method === 'mpesa'
                ? 'Check your phone for the M-Pesa prompt and enter your PIN. We\'re waiting for confirmation...'
                : 'Confirming your PayPal payment...'}
            </p>
          </div>
        )}

        {/* ── Step: Success ────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Welcome to {planMeta.label}!</h2>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              Your subscription is now active. Enjoy all the {planMeta.label} features!
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => router.push('/pricing')}>
                View Plans
              </Button>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
