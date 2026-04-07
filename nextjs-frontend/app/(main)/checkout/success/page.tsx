'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Stripe redirects here after a successful checkout:
 *   /checkout/success?session_id=cs_xxx
 *
 * The Stripe webhook has already (or will shortly) activate the subscription.
 * We just refresh the profile query and show the success screen.
 */
export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Invalidate profile so the effective tier updates in the UI
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    // Small delay to let the webhook propagate before user navigates
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [queryClient]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        {!ready ? (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-infra-primary" />
            <h1 className="text-lg font-semibold text-gray-900">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-gray-500">Just a moment while we activate your plan.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">You&apos;re all set!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your subscription is now active. Enjoy your upgraded plan!
            </p>
            {sessionId && (
              <p className="mt-3 text-xs text-gray-400 font-mono">Ref: {sessionId.slice(0, 20)}…</p>
            )}
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push('/pricing')}>
                View Plans
              </Button>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
