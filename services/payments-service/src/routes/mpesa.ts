import { Router, Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebase';
import { logger } from '../logger';

const router = Router();

// ── IP/CIDR matching helper ───────────────────────────────────────────────────
// Safaricom officially publishes callback IPs in the 196.201.214.0/24 subnet.
// Supports both exact IPs ("196.201.214.200") and CIDR notation ("196.201.214.0/24").

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpAllowed(sourceIp: string, allowlist: string[]): boolean {
  const src = ipToInt(sourceIp);
  for (const entry of allowlist) {
    if (entry.includes('/')) {
      const [network, prefixStr] = entry.split('/');
      const prefix = parseInt(prefixStr, 10);
      const mask   = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      if ((src & mask) === (ipToInt(network) & mask)) return true;
    } else {
      if (src === ipToInt(entry)) return true;
    }
  }
  return false;
}

/**
 * POST /webhooks/mpesa
 * Handles M-Pesa STK Push callbacks for both subscriptions and transactions.
 *
 * Security: Configure MPESA_CALLBACK_IPS and validate the source IP in production.
 * Safaricom callback IPs: 196.201.214.200/24, 196.201.214.206/24
 */
router.post('/', async (req: Request, res: Response) => {
  const sourceIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;

  // Only enforce IP allowlist when MPESA_CALLBACK_IPS is explicitly configured.
  // Safaricom callback IPs are in the 196.201.214.0/24 subnet.
  // Example env: MPESA_CALLBACK_IPS=196.201.214.0/24,196.201.214.206
  if (process.env.MPESA_CALLBACK_IPS) {
    const allowedCidrs = process.env.MPESA_CALLBACK_IPS.split(',').map((s) => s.trim()).filter(Boolean);
    if (!isIpAllowed(sourceIp ?? '', allowedCidrs)) {
      logger.warn('M-Pesa callback from disallowed IP', { sourceIp, allowedCidrs });
      res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
      return;
    }
  }

  const body = req.body?.Body?.stkCallback;
  if (!body) {
    logger.warn('Invalid M-Pesa payload');
    res.json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
    return;
  }

  const { CheckoutRequestID, ResultCode } = body;
  const eventId = CheckoutRequestID;

  if (!eventId || typeof eventId !== 'string') {
    logger.warn('M-Pesa webhook: missing CheckoutRequestID');
    res.json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
    return;
  }

  const processedRef = db().collection('processedWebhooks').doc(eventId);

  try {
    // Merge idempotency write and business update into ONE transaction to eliminate
    // the crash-between-transactions gap: a server crash after the idempotency commit
    // but before the business update would leave the transaction permanently unprocessed.
    const success = ResultCode === 0;
    const txnRef  = db().collection('transactions').doc(CheckoutRequestID);
    let isDuplicate = false;

    await db().runTransaction(async (txn) => {
      // ── All reads first ───────────────────────────────────────────────────
      const [snap, txnSnap] = await Promise.all([
        txn.get(processedRef),
        txn.get(txnRef),
      ]);

      if (snap.exists) {
        isDuplicate = true;
        return; // no-op transaction for duplicates
      }

      if (!txnSnap.exists) throw new Error('Transaction not found');

      // ── All writes ────────────────────────────────────────────────────────
      txn.set(processedRef, {
        provider:  'mpesa',
        eventId,
        timestamp: FieldValue.serverTimestamp(),
      });

      if (txnSnap.data()?.status !== 'completed') {
        txn.update(txnRef, {
          status:    success ? 'completed' : 'failed',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    if (isDuplicate) {
      logger.info('Duplicate M-Pesa webhook event', { eventId });
    }
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err: any) {
    logger.error('M-Pesa processing failed', { error: err.message });
    res.json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

export { router as mpesaWebhook };
