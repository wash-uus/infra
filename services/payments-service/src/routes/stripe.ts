import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebase';
import { logger } from '../logger';

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

// ── Stripe webhook ─────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn('STRIPE_WEBHOOK_SECRET not set');
    res.sendStatus(400);
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err: any) {
    logger.warn('Invalid Stripe webhook signature', { error: err.message });
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const eventId = event.id;
  const processedRef = db().collection('processedWebhooks').doc(eventId);

  try {
    // Merge idempotency write and business update into ONE transaction to eliminate
    // the crash-between-transactions gap: if the server dies after the idempotency
    // write but before the business update, the webhook would be silently lost.
    let isDuplicate = false;
    await db().runTransaction(async (txn) => {
      // ── All reads first (Firestore rule: no reads after writes in same txn) ──
      const snap = await txn.get(processedRef);
      if (snap.exists) {
        isDuplicate = true;
        return; // no-op transaction for duplicates
      }

      // Pre-read business documents for event types that need them
      let bizRef: FirebaseFirestore.DocumentReference | undefined;
      let bizSnap: FirebaseFirestore.DocumentSnapshot | undefined;
      if (
        event.type === 'payment_intent.succeeded' ||
        event.type === 'payment_intent.payment_failed'
      ) {
        const pi = event.data.object as Stripe.PaymentIntent;
        const txnId = pi.metadata?.transactionId;
        if (txnId) {
          bizRef  = db().collection('transactions').doc(txnId);
          bizSnap = await txn.get(bizRef);
        }
      }

      // ── All writes ────────────────────────────────────────────────────────
      txn.set(processedRef, {
        provider:  'stripe',
        eventId,
        timestamp: FieldValue.serverTimestamp(),
      });

      switch (event.type) {
        case 'payment_intent.succeeded': {
          if (bizRef && bizSnap) {
            if (!bizSnap.exists) throw new Error(`Transaction not found: ${bizRef.id}`);
            if (bizSnap.data()?.status !== 'completed') {
              txn.update(bizRef, { status: 'completed', updatedAt: FieldValue.serverTimestamp() });
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          if (bizRef && bizSnap) {
            if (!bizSnap.exists) return; // Nothing to update — mark processed, skip biz write
            if (bizSnap.data()?.status !== 'completed') {
              const pi = event.data.object as Stripe.PaymentIntent;
              txn.update(bizRef, { status: 'failed', updatedAt: FieldValue.serverTimestamp() });
              logger.warn('Stripe payment failed', { txnId: bizRef.id, piId: pi.id });
            }
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const uid = sub.metadata?.uid;
          if (uid) {
            const isActive  = sub.status === 'active';
            // Write nested subscription object — required by getEffectiveTier()
            // which reads userData.subscription.{tier,expiresAt}, NOT flat top-level fields.
            const expiresAt = isActive
              ? Timestamp.fromDate(new Date(sub.current_period_end * 1000))
              : null;
            txn.update(db().collection('users').doc(uid), {
              subscription:        { tier: isActive ? (sub.metadata?.tier ?? 'pro') : 'free', expiresAt },
              stripeSubscriptionId: sub.id,
              updatedAt:           FieldValue.serverTimestamp(),
            });
            logger.info('Subscription updated via Stripe', { uid, status: sub.status });
          }
          break;
        }

        default:
          // Unhandled event — only the idempotency record is written
          break;
      }
    });

    if (isDuplicate) {
      logger.info('Duplicate Stripe webhook event', { eventId });
    }
    res.json({ received: true });
  } catch (err: any) {
    logger.error('Stripe webhook processing failed', { error: err.message });
    res.status(500).send('Internal Server Error');
  }
});

export { router as stripeWebhook };
