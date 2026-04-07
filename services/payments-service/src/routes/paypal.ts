import { Router, Request, Response } from 'express';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebase';
import { logger } from '../logger';
import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';

const router = Router();

// ── Allowed PayPal cert hostnames (exact match — prevents api.paypal.com.evil.com bypasses) ──
const PAYPAL_CERT_HOSTNAMES = new Set([
  'api.paypal.com',
  'api.sandbox.paypal.com',
  'www.paypal.com',
]);

function isValidPayPalCertUrl(certUrl: string): boolean {
  try {
    const parsed = new URL(certUrl);
    return (
      parsed.protocol === 'https:' &&
      PAYPAL_CERT_HOSTNAMES.has(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

// ── Safely fetch cert over HTTPS (no redirects, no non-HTTPS) ────────────────
function fetchCert(certUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(certUrl);
    const req = https.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, timeout: 5000 },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Cert fetch failed: ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => {
          chunks.push(c);
          if (chunks.reduce((s, b) => s + b.length, 0) > 32 * 1024) {
            req.destroy();
            reject(new Error('Cert too large'));
          }
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Cert fetch timed out')); });
    req.on('error', reject);
  });
}

// ── CRC-32 (IEEE 802.3) — required for PayPal validation string ──────────────
const CRC_TABLE = (() => {
  const t: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (~crc) >>> 0;
}

function mapAlgo(paypalAlgo: string): string {
  const upper = paypalAlgo.toUpperCase();
  if (upper.includes('SHA256')) return 'RSA-SHA256';
  if (upper.includes('SHA1')) return 'RSA-SHA1';
  return paypalAlgo;
}

/**
 * Verify a PayPal webhook signature via RSA cryptographic verification.
 * Validation string: ${transmissionId}|${transmissionTime}|${webhookId}|${crc32(rawBody)}
 * Ref: https://developer.paypal.com/docs/api-basics/notifications/webhooks/
 */
async function verifyPayPalSignature(
  rawBody: Buffer,
  transmissionId: string,
  transmissionTime: string,
  certUrl: string,
  authAlgo: string,
  transmissionSig: string,
  webhookId: string,
): Promise<boolean> {
  const crc = crc32(rawBody);
  const validationMessage = `${transmissionId}|${transmissionTime}|${webhookId}|${crc}`;

  const cert = await fetchCert(certUrl); // Uses native HTTPS (no axios redirect risk)

  const algorithm = mapAlgo(authAlgo);
  const verifier = crypto.createVerify(algorithm);
  verifier.update(validationMessage);
  return verifier.verify(cert, transmissionSig, 'base64');
}

/**
 * POST /webhooks/paypal
 * express.raw() is applied upstream so req.body is a raw Buffer.
 */
router.post('/', async (req: Request, res: Response) => {
  // req.body is a Buffer because express.raw() is applied to this route upstream
  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    logger.warn('PayPal webhook: empty or non-buffer body');
    res.status(400).json({ success: false, message: 'Invalid body' });
    return;
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    logger.warn('PayPal webhook: failed to parse JSON body');
    res.status(400).json({ success: false, message: 'Invalid JSON' });
    return;
  }

  const transmissionId   = req.headers['paypal-transmission-id']   as string | undefined;
  const transmissionTime = req.headers['paypal-transmission-time'] as string | undefined;
  const certUrl          = req.headers['paypal-cert-url']          as string | undefined;
  const authAlgo         = req.headers['paypal-auth-algo']         as string | undefined;
  const transmissionSig  = req.headers['paypal-transmission-sig']  as string | undefined;

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    logger.warn('PayPal webhook: missing required signature headers');
    res.status(400).json({ success: false, message: 'Missing signature headers' });
    return;
  }

  // Guard against SSRF: exact hostname check — prevents api.paypal.com.evil.com bypasses.
  if (!isValidPayPalCertUrl(certUrl)) {
    logger.warn('PayPal webhook: certUrl hostname not in approved list', { certUrl });
    res.status(400).json({ success: false, message: 'Invalid cert_url' });
    return;
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.error('PAYPAL_WEBHOOK_ID environment variable is not configured');
    res.status(500).json({ success: false, message: 'Webhook not configured' });
    return;
  }

  let isValid: boolean;
  try {
    isValid = await verifyPayPalSignature(
      rawBody, transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig, webhookId,
    );
  } catch (err: any) {
    logger.error('PayPal signature verification error', { error: err.message });
    res.status(400).json({ success: false, message: 'Signature verification failed' });
    return;
  }

  if (!isValid) {
    logger.warn('PayPal webhook: invalid signature', { transmissionId });
    res.status(400).json({ success: false, message: 'Invalid signature' });
    return;
  }

  // Validate eventId — must be a non-empty string to be a valid Firestore doc ID
  const eventId: string = event.id;
  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    logger.warn('PayPal webhook: missing or invalid event.id');
    res.status(400).json({ success: false, message: 'Invalid event id' });
    return;
  }

  const processedRef = db().collection('processedWebhooks').doc(eventId);

  try {
    // ── Phase 1: Pre-query collection lookups (OUTSIDE the transaction) ──────────
    // Firestore transactions cannot execute .where() collection queries — only
    // document-ref gets. We resolve document refs here, then use them inside
    // ONE transaction so idempotency + business writes commit atomically.
    // This eliminates the crash gap that existed when idempotency and business
    // state were committed in separate transactions.

    let subDocRef:        FirebaseFirestore.DocumentReference | undefined;
    let txnDocRef:        FirebaseFirestore.DocumentReference | undefined;
    let cancelledUserRef: FirebaseFirestore.DocumentReference | undefined;

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId: string | undefined =
        event.resource?.supplementary_data?.related_ids?.order_id ?? event.resource?.id;

      if (orderId) {
        // Subscription payment takes priority over generic transaction payment
        const subSnap = await db().collection('subscriptions')
          .where('paypalOrderId', '==', orderId)
          .limit(1)
          .get();

        if (!subSnap.empty) {
          subDocRef = subSnap.docs[0].ref;
        } else {
          const txnSnap = await db().collection('transactions')
            .where('paypalOrderId', '==', orderId)
            .limit(1)
            .get();
          if (!txnSnap.empty) {
            txnDocRef = txnSnap.docs[0].ref;
          }
        }
      }
    } else if (
      event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.EXPIRED'
    ) {
      const paypalSubId: string | undefined = event.resource?.id;
      if (paypalSubId) {
        const userSnap = await db().collection('users')
          .where('paypalSubscriptionId', '==', paypalSubId)
          .limit(1)
          .get();
        if (!userSnap.empty) {
          cancelledUserRef = userSnap.docs[0].ref;
        }
      }
    }

    // ── Phase 2: ONE atomic transaction — idempotency + all business writes ──────
    // All Firestore reads must precede all writes within the same transaction.
    let isDuplicate = false;

    await db().runTransaction(async (txn) => {
      // ── All reads first ───────────────────────────────────────────────────────
      const idempSnap  = await txn.get(processedRef);
      if (idempSnap.exists) {
        isDuplicate = true;
        return; // no-op — already fully processed
      }

      // Transactionally re-read business docs by ref (stale outer query is irrelevant
      // — the transaction gives us the authoritative current state for conditional writes)
      const freshSubSnap = subDocRef ? await txn.get(subDocRef) : null;
      const freshTxnSnap = txnDocRef ? await txn.get(txnDocRef) : null;

      // ── All writes ────────────────────────────────────────────────────────────
      txn.set(processedRef, {
        provider:  'paypal',
        eventId,
        timestamp: FieldValue.serverTimestamp(),
      });

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED': {
          if (freshSubSnap?.exists && freshSubSnap.data()?.status !== 'completed') {
            const sub       = freshSubSnap.data()!;
            const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
            txn.update(subDocRef!, {
              status:      'completed',
              completedAt: FieldValue.serverTimestamp(),
              updatedAt:   FieldValue.serverTimestamp(),
            });
            // Write nested subscription object — required by getEffectiveTier()
            // which reads userData.subscription.{tier,expiresAt}, NOT flat top-level fields.
            txn.update(db().collection('users').doc(sub.userId as string), {
              subscription: { tier: sub.tier as string, expiresAt },
              updatedAt:    FieldValue.serverTimestamp(),
            });
            logger.info('Subscription activated via PayPal', { userId: sub.userId, tier: sub.tier });
          } else if (freshTxnSnap?.exists && freshTxnSnap.data()?.status !== 'completed') {
            txn.update(txnDocRef!, {
              status:      'completed',
              completedAt: FieldValue.serverTimestamp(),
              updatedAt:   FieldValue.serverTimestamp(),
            });
            logger.info('Transaction completed via PayPal', { txnId: txnDocRef!.id });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED': {
          if (cancelledUserRef) {
            // Write nested subscription object — required by getEffectiveTier()
            txn.update(cancelledUserRef, {
              subscription: { tier: 'free', expiresAt: null },
              updatedAt:    FieldValue.serverTimestamp(),
            });
            logger.info('Subscription downgraded via PayPal cancellation', {
              paypalSubId: event.resource?.id,
            });
          }
          break;
        }

        case 'DISPUTE.CREATED':
          // Handle disputes
          break;

        default:
          // Unrecognised event — only the idempotency record is written
          break;
      }
    });

    if (isDuplicate) {
      logger.info('Duplicate PayPal webhook event', { eventId });
    }
  } catch (err: any) {
    logger.error('Error processing PayPal event', { eventType: event.event_type, error: err.message });
    res.sendStatus(500);
    return;
  }

  res.sendStatus(200);
});

export { router as paypalWebhook };
