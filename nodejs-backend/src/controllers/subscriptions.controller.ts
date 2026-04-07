import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { col, db } from '../config/firebase';
import { env } from '../config/env';
import { AuthRequest } from '../types';
import { NotFoundError, AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { initiateStkPush } from '../services/mpesa';
import { createPayPalOrder, capturePayPalOrder } from '../services/paypal';
import { logger } from '../utils/logger';
import { PLAN_PRICES, getEffectiveTier, buildSubscriptionActivation } from '../utils/subscription';

// ── Stripe client (lazy-initialized to avoid crashing when key not configured) ─
let _stripe: import('stripe').default | null = null;
function getStripe(): import('stripe').default {
  if (_stripe) return _stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured on this server. Please contact support.', 503);
  }
  // Dynamic require avoids a hard dependency when Stripe is not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require('stripe');
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  return _stripe!;
}

// ── Helper: wrap payment-gateway errors ───────────────────────────────────────
// When a service throws (missing/placeholder credentials or upstream 4xx/5xx),
// re-throw as an AppError so the error handler returns a proper status + message.
function wrapGatewayError(err: unknown, gateway: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  const isNotConfigured = msg.toLowerCase().includes('not configured');
  throw new AppError(
    isNotConfigured
      ? `${gateway} is not configured on this server. Please contact support.`
      : `${gateway} error: ${msg}`,
    isNotConfigured ? 503 : 502,
  );
}

// ── Initiate subscription payment ─────────────────────────────────────────────
export const initiateSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { tier, currency, paymentMethod } = req.body as {
    tier: string;
    currency: 'KES' | 'USD';
    paymentMethod: 'mpesa' | 'paypal';
  };

  const plan = PLAN_PRICES[tier];
  if (!plan) {
    throw new AppError('Invalid subscription tier', 400);
  }

  const amount = plan[currency];

  // Verify user exists
  const userDoc = await col.users.doc(uid).get();
  if (!userDoc.exists) throw new NotFoundError('Profile');

  const currentTier = getEffectiveTier(userDoc.data() ?? {});
  if (currentTier === tier) {
    throw new AppError('You are already on this plan', 400);
  }

  const subId = uuidv4();
  const now = FieldValue.serverTimestamp();

  await col.subscriptions.doc(subId).set({
    userId: uid,
    tier,
    amount,
    currency,
    paymentMethod,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json({
    success: true,
    data: { subscriptionId: subId, amount, currency, tier },
  });
});

// ── M-Pesa STK Push for subscription ──────────────────────────────────────────
export const subscriptionMpesaStkPush = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { subscriptionId, phone } = req.body as { subscriptionId: string; phone: string };

  const subDoc = await col.subscriptions.doc(subscriptionId).get();
  if (!subDoc.exists) throw new NotFoundError('Subscription');

  const sub = subDoc.data()!;
  if (sub.userId !== uid) throw new AppError('Not your subscription', 403);
  if (sub.status !== 'pending') throw new AppError('Subscription is not in a payable state', 400);
  if (sub.paymentMethod !== 'mpesa') throw new AppError('Payment method mismatch', 400);

  let result: any;
  try {
    result = await initiateStkPush({
      amount: sub.amount,
      phone,
      transactionId: subscriptionId,
      userId: uid,
    });
  } catch (err) {
    wrapGatewayError(err, 'M-Pesa');
  }

  await col.subscriptions.doc(subscriptionId).update({
    mpesaCheckoutRequestId: result.CheckoutRequestID,
    mpesaMerchantRequestId: result.MerchantRequestID,
    mpesaPhone: phone,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: result });
});

// ── M-Pesa callback for subscriptions ─────────────────────────────────────────
export const subscriptionMpesaCallback = asyncHandler(async (req: Request, res: Response) => {
  // ── IP allowlist (fail-closed) ────────────────────────────────────────────────
  // MPESA_CALLBACK_IPS MUST be set in production.  If it is absent we reject the
  // request instead of warning and proceeding \u2014 an open callback lets anyone POST
  // a fake payment confirmation and receive free subscription activation.
  if (!env.MPESA_CALLBACK_IPS) {
    logger.error('SECURITY: MPESA_CALLBACK_IPS is not configured. Rejecting M-Pesa subscription callback to prevent payment fraud. Set MPESA_CALLBACK_IPS in your environment.');
    res.status(503).json({ ResultCode: 1, ResultDesc: 'M-Pesa callback not configured on this server' });
    return;
  }
  const allowedIps = env.MPESA_CALLBACK_IPS.split(',').map((ip) => ip.trim());
  const sourceIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
  if (!allowedIps.includes(sourceIp ?? '')) {
    logger.warn('Subscription M-Pesa callback from disallowed IP', { sourceIp, allowedIps });
    res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
    return;
  }

  const body = req.body?.Body?.stkCallback;
  if (!body || typeof body.CheckoutRequestID !== 'string' || typeof body.ResultCode !== 'number') {
    logger.warn('Subscription M-Pesa callback with invalid payload', { body: req.body });
    res.json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
    return;
  }

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = body;

  const snap = await col.subscriptions
    .where('mpesaCheckoutRequestId', '==', CheckoutRequestID)
    .limit(1)
    .get();

  if (snap.empty) {
    logger.warn('Subscription callback for unknown CheckoutRequestID', { CheckoutRequestID });
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const subDoc = snap.docs[0];
  const sub = subDoc.data();

  // ── Idempotency guard ────────────────────────────────────────────────────────
  // Safaricom can call a callback multiple times for the same transaction.
  // If we already processed this subscription, return success without side effects.
  if (sub.status === 'completed') {
    logger.warn('Duplicate M-Pesa subscription callback — already processed', {
      CheckoutRequestID,
      subscriptionId: subDoc.id,
    });
    res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    return;
  }

  if (ResultCode === 0) {
    const meta = CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) => meta.find((i: any) => i.Name === name)?.Value ?? null;
    const receiptNumber = getMeta('MpesaReceiptNumber');

    // Use a Firestore transaction so the subscription doc update and user activation
    // are atomic — either both succeed or neither does.
    await db.runTransaction(async (txn) => {
      // Re-read inside transaction for consistency
      const freshSnap = await txn.get(subDoc.ref);
      if (freshSnap.data()?.status === 'completed') return; // already done (concurrent call)

      txn.update(subDoc.ref, {
        status: 'completed',
        mpesaReceiptNumber: receiptNumber,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const userRef = col.users.doc(sub.userId);
      txn.update(userRef, buildSubscriptionActivation(sub.tier));
    });

    logger.info('Subscription activated via M-Pesa', {
      userId: sub.userId,
      tier: sub.tier,
      receipt: receiptNumber,
    });
  } else {
    await subDoc.ref.update({
      status: 'failed',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ── PayPal: Create order for subscription ─────────────────────────────────────
export const subscriptionPaypalCreateOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { subscriptionId } = req.body as { subscriptionId: string };

  const subDoc = await col.subscriptions.doc(subscriptionId).get();
  if (!subDoc.exists) throw new NotFoundError('Subscription');

  const sub = subDoc.data()!;
  if (sub.userId !== uid) throw new AppError('Not your subscription', 403);
  if (sub.status !== 'pending') throw new AppError('Subscription is not in a payable state', 400);
  if (sub.paymentMethod !== 'paypal') throw new AppError('Payment method mismatch', 400);

  let order: any;
  try {
    order = await createPayPalOrder({
      amount: sub.amount,
      currency: sub.currency === 'KES' ? 'USD' : sub.currency,
      transactionId: subscriptionId,
    });
  } catch (err) {
    wrapGatewayError(err, 'PayPal');
  }

  await col.subscriptions.doc(subscriptionId).update({
    paypalOrderId: order.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: order });
});

// ── PayPal: Capture order for subscription ────────────────────────────────────
export const subscriptionPaypalCaptureOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { subscriptionId, orderId } = req.body as { subscriptionId: string; orderId: string };

  const subDoc = await col.subscriptions.doc(subscriptionId).get();
  if (!subDoc.exists) throw new NotFoundError('Subscription');

  const sub = subDoc.data()!;
  if (sub.userId !== uid) throw new AppError('Not your subscription', 403);
  if (sub.paymentMethod !== 'paypal') throw new AppError('Payment method mismatch', 400);

  // Idempotency guard: return success if subscription is already completed
  if (sub.status === 'completed') {
    res.json({ success: true, message: 'Subscription already activated' });
    return;
  }

  if (sub.status !== 'pending') {
    throw new AppError(`Subscription is not in a payable state (status: ${sub.status})`, 400);
  }

  let capture: any;
  try {
    capture = await capturePayPalOrder(orderId);
  } catch (err) {
    wrapGatewayError(err, 'PayPal');
  }

  // Atomically mark subscription complete + activate user tier in a single transaction.
  // The re-read inside the transaction prevents double-activation on concurrent retries.
  await db.runTransaction(async (txn) => {
    const freshSnap = await txn.get(col.subscriptions.doc(subscriptionId));
    if (freshSnap.data()?.status === 'completed') return; // concurrent call already processed

    const subRef = col.subscriptions.doc(subscriptionId);
    const userRef = col.users.doc(sub.userId);
    const userSnap = await txn.get(userRef);
    if (!userSnap.exists) throw new NotFoundError('User');

    txn.update(subRef, {
      status: 'completed',
      paypalCaptureId: capture.id,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    txn.update(userRef, buildSubscriptionActivation(sub.tier));
  });

  logger.info('Subscription activated via PayPal', { userId: sub.userId, tier: sub.tier });

  res.json({ success: true, message: 'Subscription activated' });
});

// ── Poll subscription status (for M-Pesa — user polls after STK push) ────────
export const getSubscriptionStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const subDoc = await col.subscriptions.doc(id).get();
  if (!subDoc.exists) throw new NotFoundError('Subscription');

  const sub = subDoc.data()!;
  if (sub.userId !== uid) throw new AppError('Not your subscription', 403);

  res.json({
    success: true,
    data: {
      status: sub.status,
      tier: sub.tier,
      completedAt: sub.completedAt ?? null,
    },
  });
});

// ── Helper: activate subscription on user profile ─────────────────────────────
// Kept for any legacy code paths that still call activateSubscription directly.
// New code should use db.runTransaction + buildSubscriptionActivation instead.
async function activateSubscription(userId: string, tier: string): Promise<void> {
  await db.runTransaction(async (txn) => {
    const userRef = col.users.doc(userId);
    const snap = await txn.get(userRef);
    if (!snap.exists) throw new NotFoundError('User');
    txn.update(userRef, buildSubscriptionActivation(tier));
  });
}

// ── Stripe: create checkout session ──────────────────────────────────────────
// Creates a Stripe Checkout Session for a subscription plan.
// The success_url must include {CHECKOUT_SESSION_ID} so the webhook can correlate.
export const stripeCreateCheckoutSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { tier, currency = 'USD' } = req.body as { tier: string; currency?: 'KES' | 'USD' };

  const plan = PLAN_PRICES[tier];
  if (!plan) throw new AppError('Invalid subscription tier', 400);

  const userDoc = await col.users.doc(uid).get();
  if (!userDoc.exists) throw new NotFoundError('Profile');

  const currentTier = getEffectiveTier(userDoc.data() ?? {});
  if (currentTier === tier) throw new AppError('You are already on this plan', 400);

  const stripe = getStripe();

  // Stripe uses USD cents; KES charged in USD equivalent
  const amountCents = Math.round(plan.USD * 100);
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `INFRA ${tierLabel} Plan`,
            description: '30-day subscription',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { userId: uid, tier },
    success_url: `${env.CORS_ORIGINS.split(',')[0]}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CORS_ORIGINS.split(',')[0]}/pricing`,
  });

  res.json({ success: true, data: { sessionId: session.id, url: session.url } });
});

// ── Stripe: webhook handler ───────────────────────────────────────────────────
// Called by Stripe when a checkout session is completed.
// Raw body parsing is required for signature verification — see app.ts setup.
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.error('SECURITY: STRIPE_WEBHOOK_SECRET is not configured. Rejecting webhook.');
    res.status(503).json({ error: 'Webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: import('stripe').default.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', { error: String(err) });
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as import('stripe').default.Checkout.Session;
    const { userId, tier } = session.metadata ?? {};

    if (!userId || !tier) {
      logger.error('Stripe webhook: missing metadata on checkout session', { sessionId: session.id });
      res.json({ received: true });
      return;
    }

    // Idempotency: use a deterministic document ID derived from the Stripe session ID
    // so that concurrent webhook deliveries for the same event converge on the same
    // document — preventing duplicate subscription records from a TOCTOU race.
    const subId = `stripe_${session.id}`;
    await db.runTransaction(async (txn) => {
      const subRef = col.subscriptions.doc(subId);
      const userRef = col.users.doc(userId);

      // Re-read inside the transaction — only process once.
      const [existingSnap, userSnap] = await Promise.all([txn.get(subRef), txn.get(userRef)]);
      if (existingSnap.exists && existingSnap.data()?.status === 'completed') {
        logger.warn('Duplicate Stripe webhook — already processed', { sessionId: session.id });
        return; // early-return inside the transaction; no writes
      }
      if (!userSnap.exists) throw new NotFoundError('User');

      txn.set(subRef, {
        userId,
        tier,
        stripeSessionId: session.id,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: 'USD',
        paymentMethod: 'stripe',
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      txn.update(userRef, buildSubscriptionActivation(tier));
    });

    logger.info('Subscription activated via Stripe', { userId, tier, sessionId: session.id });

    // Fire-and-forget conversion event
    col.conversionEvents.add({
      type: 'checkout_complete',
      paymentMethod: 'stripe',
      userId,
      tier,
      sessionId: session.id,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  }

  res.json({ received: true });
});
