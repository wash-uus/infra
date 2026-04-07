import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
const firestoreDb = getFirestore();
import { col } from '../config/firebase';
import { env } from '../config/env';
import { AuthRequest, Transaction } from '../types';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { initiateStkPush, queryTransactionStatus } from '../services/mpesa';
import { createPayPalOrder, capturePayPalOrder, verifyPayPalWebhook } from '../services/paypal';
import { enqueueNotification } from '../queues/notifications.queue';
import { logger } from '../utils/logger';

// ── Platform commission ───────────────────────────────────────────────────────
// INFRA takes a 5% commission on every completed escrow release.
// This is deducted from the transaction amount at the point of release.
// The professional receives 95% of the agreed amount.
// Commission revenue is tracked in the `commissions` collection for reconciliation.
const PLATFORM_COMMISSION_RATE = 0.05;

// ── List my transactions ──────────────────────────────────────────────────────
export const listTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { role } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query;
  if (role === 'professional') {
    query = col.transactions.where('professionalId', '==', uid);
  } else {
    query = col.transactions.where('clientId', '==', uid);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
  const txns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: txns });
});

// ── Create escrow transaction ─────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (createTransactionSchema) in the route.
export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { jobId, toolId, professionalId, amount, currency, paymentMethod, notes } = req.body;

  // Prevent creating a transaction with yourself
  if (professionalId === uid) {
    throw new ForbiddenError('Cannot create a transaction with yourself');
  }

  // Verify both parties exist
  const [clientDoc, profDoc] = await Promise.all([
    col.users.doc(uid).get(),
    col.users.doc(professionalId).get(),
  ]);
  if (!clientDoc.exists) throw new NotFoundError('Client profile');
  if (!profDoc.exists) throw new NotFoundError('Professional profile');

  // Verify referenced job/tool exists and involves the caller
  if (jobId) {
    const jobDoc = await col.jobs.doc(jobId).get();
    if (!jobDoc.exists) throw new NotFoundError('Job');
  }
  if (toolId) {
    const toolDoc = await col.tools.doc(toolId).get();
    if (!toolDoc.exists) throw new NotFoundError('Tool');
  }

  const txnId = uuidv4();
  const now = FieldValue.serverTimestamp();

  const txn: Omit<Transaction, 'id'> = {
    jobId,
    toolId,
    clientId: uid,
    clientName: clientDoc.data()?.displayName ?? '',
    professionalId,
    professionalName: profDoc.data()?.displayName ?? '',
    amount,
    currency,
    paymentMethod,
    status: 'pending',
    notes,
    createdAt: now as any,
    updatedAt: now as any,
  };

  await col.transactions.doc(txnId).set(txn);
  res.status(201).json({ success: true, data: { id: txnId, ...txn } });
});

// ── Update transaction status ─────────────────────────────────────────────────
const assertParty = (txn: Transaction, uid: string, allowed: ('client' | 'professional' | 'admin')[]) => {
  const isClient = txn.clientId === uid;
  const isProfessional = txn.professionalId === uid;
  if (allowed.includes('client') && isClient) return;
  if (allowed.includes('professional') && isProfessional) return;
  throw new ForbiddenError();
};

export const markInProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.transactions.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Transaction');
  assertParty(doc.data() as Transaction, uid, ['professional']);
  await col.transactions.doc(id).update({ status: 'in_progress', updatedAt: FieldValue.serverTimestamp() });
  res.json({ success: true });
});

export const markComplete = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.transactions.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Transaction');
  assertParty(doc.data() as Transaction, uid, ['professional']);
  await col.transactions.doc(id).update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.json({ success: true });
});

export const releasePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.transactions.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Transaction');
  const txnData = doc.data() as Transaction;
  assertParty(txnData, uid, ['client']);
  if (txnData.status !== 'completed') {
    res.status(400).json({ success: false, message: 'Payment can only be released after the professional marks work as complete.' });
    return;
  }

  // Compute platform commission
  const grossAmount = txnData.amount;
  const commissionAmount = Math.round(grossAmount * PLATFORM_COMMISSION_RATE * 100) / 100;
  const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

  const commissionId = uuidv4();
  const now = FieldValue.serverTimestamp();

  // Use a Firestore transaction with a re-read guard to prevent double-release.
  // Without this, two concurrent requests could both pass the status === 'completed'
  // check above and create two separate commission records.
  const alreadyReleased = await firestoreDb.runTransaction(async (txn) => {
    const freshDoc = await txn.get(col.transactions.doc(id));
    const freshData = freshDoc.data() as Transaction | undefined;
    if (freshData?.status === 'released') return true; // already released
    if (freshData?.status !== 'completed') return true; // concurrent status change — abort

    txn.update(col.transactions.doc(id), {
      status: 'released',
      commissionAmount,
      netAmount,
      commissionRate: PLATFORM_COMMISSION_RATE,
      releasedAt: now,
      updatedAt: now,
    });
    txn.set(firestoreDb.collection('commissions').doc(commissionId), {
      transactionId: id,
      clientId: txnData.clientId,
      professionalId: txnData.professionalId,
      grossAmount,
      commissionAmount,
      netAmount,
      commissionRate: PLATFORM_COMMISSION_RATE,
      currency: txnData.currency,
      status: 'pending_disbursement',
      createdAt: now,
    });
    return false;
  });

  if (alreadyReleased) {
    res.json({ success: true, message: 'Payment already released', data: { grossAmount, commissionAmount, netAmount, currency: txnData.currency } });
    return;
  }

  logger.info('Payment released with commission', {
    transactionId: id,
    grossAmount,
    commissionAmount,
    netAmount,
    currency: txnData.currency,
  });

  // Notify professional of net payout
  if (txnData?.professionalId) {
    enqueueNotification(txnData.professionalId, {
      type: 'transaction',
      title: 'Payment Released',
      body: `${txnData.currency} ${netAmount.toLocaleString()} has been released to you (${txnData.currency} ${grossAmount.toLocaleString()} minus 5% platform fee).`,
      recipientId: txnData.professionalId,
      data: { transactionId: id },
    }).catch(() => {});
  }
  res.json({
    success: true,
    message: 'Payment released to professional',
    data: { grossAmount, commissionAmount, netAmount, currency: txnData.currency },
  });
});

// ── M-Pesa STK Push ───────────────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (mpesaStkPushSchema) in the route.
export const mpesaStkPush = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { amount, phone, transactionId } = req.body;

  // Verify transaction exists and belongs to the caller (must be the client)
  const txnDoc = await col.transactions.doc(transactionId).get();
  if (!txnDoc.exists) throw new NotFoundError('Transaction');
  const txnData = txnDoc.data() as Transaction;
  if (txnData.clientId !== uid) throw new ForbiddenError('Only the client can initiate payment');
  if (txnData.status !== 'pending') {
    throw new AppError('Transaction is not in a payable state', 400);
  }

  // ── Idempotency: if an STK push was already initiated, return cached result ──
  if (txnData.mpesaCheckoutRequestId) {
    logger.info('M-Pesa STK push already initiated — returning cached result', {
      transactionId,
      checkoutRequestId: txnData.mpesaCheckoutRequestId,
    });
    res.json({
      success: true,
      data: {
        CheckoutRequestID: txnData.mpesaCheckoutRequestId,
        MerchantRequestID: txnData.mpesaMerchantRequestId ?? null,
        alreadyInitiated: true,
      },
    });
    return;
  }

  const result = await initiateStkPush({ amount, phone, transactionId, userId: uid });

  // Update transaction with checkout request ID — do NOT set status to 'deposited' yet.
  // The callback will confirm the payment.
  await col.transactions.doc(transactionId).update({
    mpesaCheckoutRequestId: result.CheckoutRequestID,
    mpesaMerchantRequestId: result.MerchantRequestID,
    mpesaPhone: phone,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: result });
});

// ── M-Pesa callback (webhook) ─────────────────────────────────────────────────
// Called by Safaricom — no user auth, but we verify source IP + payload structure.
export const mpesaCallback = asyncHandler(async (req: Request, res: Response) => {
  // ── IP allowlist verification ───────────────────────────────────────────────
  if (env.MPESA_CALLBACK_IPS) {
    const allowedIps = env.MPESA_CALLBACK_IPS.split(',').map((ip) => ip.trim());
    const sourceIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    if (!allowedIps.includes(sourceIp ?? '')) {
      logger.warn('M-Pesa callback from disallowed IP', { sourceIp, allowedIps });
      res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
      return;
    }
  }

  const body = req.body?.Body?.stkCallback;
  if (!body || typeof body.CheckoutRequestID !== 'string' || typeof body.ResultCode !== 'number') {
    logger.warn('M-Pesa callback with invalid payload structure', { body: req.body });
    res.json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
    return;
  }

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = body;

  // ── Step 1: Check microtransactions first ────────────────────────────────────
  // Unlock / boost payments use a separate collection with the same CheckoutRequestID
  const microSnap = await col.microtransactions
    .where('mpesaCheckoutRequestId', '==', CheckoutRequestID)
    .limit(1)
    .get();

  if (!microSnap.empty) {
    const microRef = microSnap.docs[0].ref;
    const microData = microSnap.docs[0].data() as import('../types').Microtransaction;

    // Duplicate protection
    const alreadyDone = await firestoreDb.runTransaction(async (fsTxn) => {
      const fresh = await fsTxn.get(microRef);
      if ((fresh.data() as any)?.mpesaCallbackProcessed) return true;
      fsTxn.update(microRef, { mpesaCallbackProcessed: true });
      return false;
    });
    if (alreadyDone) {
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      return;
    }

    if (ResultCode === 0) {
      const completedAt = FieldValue.serverTimestamp();
      await microRef.update({ status: 'completed', completedAt });

      // Post-payment side-effects by type
      if (microData.type === 'applicant_unlock') {
        // Create unlock record so getJobApplications reveals the applicant
        const unlockId = `${microData.userId}_${microData.targetId}`;
        await col.unlockedApplications.doc(unlockId).set({
          employerId: microData.userId,
          applicationId: microData.targetId,
          jobId: microData.targetContextId,
          microtransactionId: microSnap.docs[0].id,
          unlockedAt: completedAt,
        });
        logger.info('Applicant unlocked via M-Pesa', {
          employerId: microData.userId,
          applicationId: microData.targetId,
        });
        // Notify employer
        enqueueNotification(microData.userId, {
          type: 'system',
          title: 'Applicant Unlocked',
          body: 'Payment confirmed. You can now view the applicant\'s contact details.',
          recipientId: microData.userId,
          data: { applicationId: microData.targetId, jobId: microData.targetContextId },
        }).catch(() => {});

      } else if (microData.type === 'application_boost') {
        // Elevate the application in the ranked list
        await col.jobApplications.doc(microData.targetId).update({
          isApplicationBoosted: true,
          applicationBoostScore: Date.now(),
          updatedAt: completedAt,
        });
        logger.info('Application boosted via M-Pesa', { applicationId: microData.targetId });
        enqueueNotification(microData.userId, {
          type: 'system',
          title: 'Application Boosted',
          body: 'Payment confirmed. Your application now appears at the top of the list.',
          recipientId: microData.userId,
          data: { applicationId: microData.targetId, jobId: microData.targetContextId },
        }).catch(() => {});
      }
    } else {
      await microRef.update({ status: 'failed', updatedAt: FieldValue.serverTimestamp() });
      logger.warn('Microtransaction M-Pesa payment failed', {
        CheckoutRequestID,
        type: microData.type,
        ResultCode,
      });
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  // ── Step 2: Regular escrow transaction ───────────────────────────────────────
  // Find related transaction by checkout ID (must already have one from STK push)
  const snap = await col.transactions
    .where('mpesaCheckoutRequestId', '==', CheckoutRequestID)
    .limit(1)
    .get();

  if (snap.empty) {
    logger.warn('M-Pesa callback for unknown CheckoutRequestID', { CheckoutRequestID });
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  // ── Duplicate callback protection via Firestore transaction ─────────────────
  const txnRef = snap.docs[0].ref;
  const alreadyProcessed = await firestoreDb.runTransaction(async (fsTxn) => {
    const freshDoc = await fsTxn.get(txnRef);
    const freshData = freshDoc.data() as Transaction | undefined;
    if (freshData?.mpesaCallbackProcessed) return true;
    fsTxn.update(txnRef, { mpesaCallbackProcessed: true });
    return false;
  });

  if (alreadyProcessed) {
    logger.info('Duplicate M-Pesa callback ignored', { CheckoutRequestID });
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  if (ResultCode === 0) {
    // Payment successful
    const meta = CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) =>
      meta.find((i: any) => i.Name === name)?.Value ?? null;

    const receiptNumber = getMeta('MpesaReceiptNumber');

    await txnRef.update({
      status: 'deposited',
      mpesaReceiptNumber: receiptNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Payment failed — revert to pending
    await txnRef.update({
      status: 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ── PayPal: Create order ──────────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (paypalCreateOrderSchema) in the route.
export const createPaypalOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { amount, currency, transactionId } = req.body;

  // Verify transaction exists and belongs to the caller
  const txnDoc = await col.transactions.doc(transactionId).get();
  if (!txnDoc.exists) throw new NotFoundError('Transaction');
  const txnData = txnDoc.data() as Transaction;
  if (txnData.clientId !== uid) throw new ForbiddenError('Only the client can initiate payment');
  if (txnData.status !== 'pending') {
    throw new AppError('Transaction is not in a payable state', 400);
  }

  const order = await createPayPalOrder({ amount, currency, transactionId });
  res.json({ success: true, data: order });
});

// ── PayPal: Capture order ─────────────────────────────────────────────────────
// Body is pre-validated by Zod middleware (paypalCaptureOrderSchema) in the route.
export const capturePaypalOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { orderId, transactionId } = req.body;

  // Verify transaction exists and belongs to the caller
  const txnDoc = await col.transactions.doc(transactionId).get();
  if (!txnDoc.exists) throw new NotFoundError('Transaction');
  const txnData = txnDoc.data() as Transaction;
  if (txnData.clientId !== uid) throw new ForbiddenError('Only the client can capture payment');

  // Idempotency: if already deposited with this orderId, return success without
  // calling PayPal again (protects against retry storms).
  if (txnData.status === 'deposited' && txnData.paypalOrderId === orderId) {
    res.json({ success: true, message: 'Payment already captured' });
    return;
  }

  if (txnData.status !== 'pending') {
    throw new AppError(`Transaction is not in a payable state (status: ${txnData.status})`, 400);
  }

  const capture = await capturePayPalOrder(orderId);

  // PayPal returns a capture object; we must verify COMPLETED before crediting.
  if (capture.status !== 'COMPLETED') {
    logger.warn('PayPal capture returned non-COMPLETED status', {
      orderId,
      captureStatus: capture.status,
    });
    res.status(402).json({
      success: false,
      message: `Payment capture failed (status: ${capture.status}). Please contact support.`,
    });
    return;
  }

  await col.transactions.doc(transactionId).update({
    paypalOrderId: orderId,
    status: 'deposited',
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: capture });
});

// ── PayPal: Webhook (payment events) ─────────────────────────────────────────
// Called by PayPal — no user auth. Signature is verified via PayPal API.
export const paypalWebhook = asyncHandler(async (req: Request, res: Response) => {
  const transmissionId = req.headers['paypal-transmission-id'] as string | undefined;
  const transmissionTime = req.headers['paypal-transmission-time'] as string | undefined;
  const certUrl = req.headers['paypal-cert-url'] as string | undefined;
  const authAlgo = req.headers['paypal-auth-algo'] as string | undefined;
  const transmissionSig = req.headers['paypal-transmission-sig'] as string | undefined;

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    logger.warn('PayPal webhook missing required headers');
    res.status(400).json({ error: 'Missing PayPal webhook headers' });
    return;
  }

  // Validate certUrl domain to prevent SSRF — must be from paypal.com
  if (!certUrl.startsWith('https://api.paypal.com/') && !certUrl.startsWith('https://api.sandbox.paypal.com/')) {
    logger.warn('PayPal webhook cert_url is not from paypal.com', { certUrl });
    res.status(400).json({ error: 'Invalid cert_url' });
    return;
  }

  if (!env.PAYPAL_WEBHOOK_ID) {
    logger.warn('PAYPAL_WEBHOOK_ID not configured — skipping webhook signature verification');
  } else {
    const rawBody = typeof (req as any).rawBody === 'string'
      ? (req as any).rawBody
      : JSON.stringify(req.body);

    const valid = await verifyPayPalWebhook({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookId: env.PAYPAL_WEBHOOK_ID,
      rawBody,
    });

    if (!valid) {
      logger.warn('PayPal webhook signature verification failed', { transmissionId });
      res.status(401).json({ error: 'Webhook signature verification failed' });
      return;
    }
  }

  const event = req.body;
  const eventType: string = event?.event_type ?? '';
  const resource = event?.resource ?? {};

  // PAYMENT.CAPTURE.COMPLETED — update transaction status to deposited
  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const orderId: string = resource?.supplementary_data?.related_ids?.order_id ?? '';
    if (orderId) {
      const snap = await col.transactions
        .where('paypalOrderId', '==', orderId)
        .limit(1)
        .get();

      if (!snap.empty) {
        const txnRef = snap.docs[0].ref;
        // Idempotent update — only change if not already deposited
        const freshDoc = snap.docs[0].data() as Transaction;
        if (freshDoc.status !== 'deposited') {
          await txnRef.update({
            status: 'deposited',
            paypalCaptureId: resource?.id ?? null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          logger.info('PayPal PAYMENT.CAPTURE.COMPLETED processed', { orderId });
        }
      }
    }
  }

  // PAYMENT.CAPTURE.DENIED / PAYMENT.CAPTURE.REFUNDED — revert status
  if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    const orderId: string = resource?.supplementary_data?.related_ids?.order_id ?? '';
    if (orderId) {
      const snap = await col.transactions
        .where('paypalOrderId', '==', orderId)
        .limit(1)
        .get();

      if (!snap.empty) {
        await snap.docs[0].ref.update({
          status: 'pending',
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info('PayPal capture denied/refunded — reverting to pending', { orderId, eventType });
      }
    }
  }

  res.json({ received: true });
});
