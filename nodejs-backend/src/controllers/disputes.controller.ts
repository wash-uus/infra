/**
 * Disputes Controller
 *
 * Handles the full dispute lifecycle:
 *   1. Buyer or seller raises a dispute on a transaction
 *   2. Platform admin reviews and resolves (release to professional / refund to client)
 *   3. Escrow is frozen while dispute is open
 *   4. Pub/Sub event triggers notifications for all parties
 *
 * States: open → under_review → resolved | dismissed
 */

import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { col, db } from '../config/firebase';
import { AuthRequest } from '../types';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { enqueueNotification } from '../queues/notifications.queue';

// ── Raise a dispute ───────────────────────────────────────────────────────────
export const raiseDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { transactionId } = req.params;
  const { reason, evidence } = req.body;

  if (!reason?.trim()) throw new BadRequestError('Dispute reason is required');

  // Verify the transaction exists and the raiser is a party to it
  const txDoc = await col.transactions.doc(transactionId).get();
  if (!txDoc.exists) throw new NotFoundError('Transaction');

  const tx = txDoc.data() as any;
  if (tx.senderId !== uid && tx.recipientId !== uid) {
    throw new ForbiddenError('You are not a party to this transaction');
  }

  if (['released', 'refunded', 'cancelled'].includes(tx.status)) {
    throw new BadRequestError(`Cannot dispute a transaction with status: ${tx.status}`);
  }

  // Check for existing open dispute on this transaction
  const existingDispute = await col.disputes
    .where('transactionId', '==', transactionId)
    .where('status', 'in', ['open', 'under_review'])
    .limit(1)
    .get();

  if (!existingDispute.empty) {
    throw new BadRequestError('A dispute is already open for this transaction');
  }

  const disputeId = uuidv4();
  const now       = FieldValue.serverTimestamp();

  const dispute = {
    transactionId,
    raisedBy:    uid,
    reason:      reason.trim(),
    evidence:    evidence ?? null,
    status:      'open',
    respondedBy: null,
    resolution:  null,
    adminNotes:  null,
    createdAt:   now,
    updatedAt:   now,
  };

  // Freeze escrow: update transaction + create dispute atomically
  const batch = db.batch();
  batch.set(col.disputes.doc(disputeId), dispute);
  batch.update(col.transactions.doc(transactionId), {
    status:    'disputed',
    updatedAt: now,
  });
  await batch.commit();

  // Notify both parties + admin
  const otherPartyId = tx.senderId === uid ? tx.recipientId : tx.senderId;
  enqueueNotification(otherPartyId, {
    type:        'dispute_raised',
    title:       'A Dispute Has Been Opened',
    body:        `A dispute was raised on transaction #${transactionId.slice(0, 8)}. Platform admin has been notified.`,
    recipientId: otherPartyId,
    data:        { disputeId, transactionId },
  }).catch(() => {});

  logger.info('Dispute raised', { disputeId, transactionId, raisedBy: uid });

  res.status(201).json({ success: true, data: { id: disputeId, ...dispute } });
});

// ── Get dispute details ───────────────────────────────────────────────────────
export const getDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid       = req.user!.uid;
  const isAdmin   = req.user?.isAdmin ?? false;
  const { disputeId } = req.params;

  const doc = await col.disputes.doc(disputeId).get();
  if (!doc.exists) throw new NotFoundError('Dispute');

  const dispute = doc.data() as any;

  // Only parties + admin can see dispute details
  const txDoc = await col.transactions.doc(dispute.transactionId).get();
  const tx    = txDoc.data() as any;
  if (!isAdmin && tx.senderId !== uid && tx.recipientId !== uid) {
    throw new ForbiddenError('Access denied');
  }

  res.json({ success: true, data: { id: doc.id, ...dispute } });
});

// ── Get all disputes for a user (their own) ───────────────────────────────────
export const getMyDisputes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;

  const snapshot = await col.disputes
    .where('raisedBy', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const disputes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: disputes });
});

// ── Admin: list all disputes by status ───────────────────────────────────────
export const listDisputesAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');

  const { status = 'open' } = req.query as { status?: string };

  const snapshot = await col.disputes
    .where('status', '==', status)
    .orderBy('createdAt', 'asc')   // oldest disputes first (FIFO queue)
    .limit(50)
    .get();

  const disputes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: disputes, meta: { total: disputes.length, status } });
});

// ── Admin: escalate dispute to under_review ───────────────────────────────────
export const escalateDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');
  const { disputeId } = req.params;
  const { adminNotes } = req.body;

  const doc = await col.disputes.doc(disputeId).get();
  if (!doc.exists) throw new NotFoundError('Dispute');

  if (doc.data()?.status !== 'open') {
    throw new BadRequestError('Only open disputes can be escalated');
  }

  await col.disputes.doc(disputeId).update({
    status:     'under_review',
    adminNotes: adminNotes ?? null,
    reviewedBy: req.user!.uid,
    updatedAt:  FieldValue.serverTimestamp(),
  });

  res.json({ success: true, data: { id: disputeId, status: 'under_review' } });
});

// ── Admin: resolve dispute ────────────────────────────────────────────────────
export const resolveDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) throw new ForbiddenError('Admin access required');
  const adminUid = req.user!.uid;
  const { disputeId } = req.params;
  const { resolution, outcome, adminNotes } = req.body;
  // outcome: 'release_to_professional' | 'refund_to_client' | 'split'

  const VALID_OUTCOMES = ['release_to_professional', 'refund_to_client', 'split', 'dismissed'];
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new BadRequestError(`Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}`);
  }

  const disputeDoc = await col.disputes.doc(disputeId).get();
  if (!disputeDoc.exists) throw new NotFoundError('Dispute');

  const dispute = disputeDoc.data() as any;
  if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
    throw new BadRequestError('Dispute already closed');
  }

  const txDoc = await col.transactions.doc(dispute.transactionId).get();
  if (!txDoc.exists) throw new NotFoundError('Transaction');
  const tx = txDoc.data() as any;

  const now = FieldValue.serverTimestamp();

  // Map outcome → transaction status
  const txStatusMap: Record<string, string> = {
    release_to_professional: 'released',
    refund_to_client:        'refunded',
    split:                   'partially_released',
    dismissed:               'released',  // dismissed → keep original outcome
  };

  const batch = db.batch();
  batch.update(col.disputes.doc(disputeId), {
    status:      outcome === 'dismissed' ? 'dismissed' : 'resolved',
    resolution:  resolution ?? null,
    outcome,
    adminNotes:  adminNotes ?? null,
    resolvedBy:  adminUid,
    resolvedAt:  now,
    updatedAt:   now,
  });
  batch.update(col.transactions.doc(dispute.transactionId), {
    status:     txStatusMap[outcome],
    updatedAt:  now,
  });
  await batch.commit();

  // Notify both parties
  const parties = [tx.senderId, tx.recipientId].filter(Boolean);
  const outcomeMsg: Record<string, string> = {
    release_to_professional: 'Dispute resolved: payment released to professional.',
    refund_to_client:        'Dispute resolved: payment refunded to client.',
    split:                   'Dispute resolved: payment split between parties.',
    dismissed:               'Dispute dismissed: no action taken.',
  };

  parties.forEach((pid: string) => {
    enqueueNotification(pid, {
      type:        'dispute_resolved',
      title:       'Dispute Resolved',
      body:        outcomeMsg[outcome] ?? 'Your dispute has been resolved.',
      recipientId: pid,
      data:        { disputeId, transactionId: dispute.transactionId, outcome },
    }).catch(() => {});
  });

  logger.info('Dispute resolved', { disputeId, outcome, resolvedBy: adminUid });
  res.json({ success: true, data: { id: disputeId, outcome } });
});
