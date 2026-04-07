import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col } from '../config/firebase';
import { AuthRequest, Connection, UserContact } from '../types';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { adminEvents } from './admin.controller';

// ── Send connection request ───────────────────────────────────────────────────
export const sendConnectionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { receiverId, projectRef } = req.body;

  if (uid === receiverId) throw new ForbiddenError('Cannot connect to yourself');

  // Check existing connection
  const existing = await col.connections
    .where('requesterId', '==', uid)
    .where('receiverId', '==', receiverId)
    .limit(1)
    .get();
  if (!existing.empty) throw new ConflictError('Connection request already sent');

  const [requesterDoc, receiverDoc] = await Promise.all([
    col.users.doc(uid).get(),
    col.users.doc(receiverId).get(),
  ]);

  if (!receiverDoc.exists) throw new NotFoundError('User');

  const connId = uuidv4();
  const now = FieldValue.serverTimestamp();

  const connection: Omit<Connection, 'id'> = {
    requesterId: uid,
    requesterName: requesterDoc.data()?.displayName ?? '',
    requesterPhoto: requesterDoc.data()?.photoURL,
    receiverId,
    receiverName: receiverDoc.data()?.displayName ?? '',
    receiverPhoto: receiverDoc.data()?.photoURL,
    status: 'pending',
    contactUnlocked: false,
    projectRef,
    createdAt: now as any,
    updatedAt: now as any,
  };

  await col.connections.doc(connId).set(connection);
  res.status(201).json({ success: true, data: { id: connId, ...connection } });
});

// ── Respond to connection request ────────────────────────────────────────────
export const respondToConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const { action } = req.body; // 'accept' | 'reject' | 'block'

  const doc = await col.connections.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Connection');

  const conn = doc.data() as Connection;
  if (conn.receiverId !== uid) throw new ForbiddenError();

  const statusMap: Record<string, string> = {
    accept: 'accepted',
    reject: 'rejected',
    block: 'blocked',
  };

  const newStatus = statusMap[action];
  if (!newStatus) throw new BadRequestError('Invalid action. Must be accept, reject, or block');

  await col.connections.doc(id).update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true, status: newStatus });
});

// ── List my connections ───────────────────────────────────────────────────────
export const listConnections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { status = 'accepted' } = req.query as Record<string, string>;

  const [sent, received] = await Promise.all([
    col.connections.where('requesterId', '==', uid).where('status', '==', status).get(),
    col.connections.where('receiverId', '==', uid).where('status', '==', status).get(),
  ]);

  const connections = [
    ...sent.docs.map((d) => ({ id: d.id, ...d.data() })),
    ...received.docs.map((d) => ({ id: d.id, ...d.data() })),
  ];

  res.json({ success: true, data: connections });
});

// ── List pending requests ─────────────────────────────────────────────────────
export const listPendingRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.connections
    .where('receiverId', '==', uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();
  const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: requests });
});

// ── Unlock contact details ────────────────────────────────────────────────────
export const unlockContact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const doc = await col.connections.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Connection');
  const conn = doc.data() as Connection;

  if (conn.requesterId !== uid && conn.receiverId !== uid) throw new ForbiddenError();
  if (conn.status !== 'accepted') throw new ForbiddenError('Connection must be accepted first');

  await col.connections.doc(id).update({
    contactUnlocked: true,
    contactUnlockedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true });
});

// ── Manage contact info ───────────────────────────────────────────────────────
export const addContact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { contactType, value, visibilityLevel } = req.body;

  const contactId = uuidv4();
  const contact: UserContact = {
    id: contactId,
    userId: uid,
    contactType,
    value,
    isVerified: false,
    visibilityLevel: visibilityLevel ?? 'private',
    createdAt: FieldValue.serverTimestamp() as any,
  };

  await col.users.doc(uid).collection('contacts').doc(contactId).set(contact);
  res.status(201).json({ success: true, data: contact });
});

export const listMyContacts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.users.doc(uid).collection('contacts').get();
  res.json({ success: true, data: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

// ── Submit abuse report ───────────────────────────────────────────────────────
export const submitAbuseReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { reportedUserId, reportedItemType, reportedItemId, reason, details, description } = req.body;

  if (!reason) throw new (await import('../utils/errors')).AppError('reason is required', 400);

  const reportId = uuidv4();
  await col.abuseReports.doc(reportId).set({
    id: reportId,
    reporterId: uid,
    reportedUserId: reportedUserId ?? reportedItemId ?? '',
    reportedItemType: reportedItemType ?? 'user',
    reportedItemId: reportedItemId ?? reportedUserId ?? '',
    reason,
    details: details ?? description ?? '',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  // Notify admin SSE stream
  adminEvents.emit('NEW_ABUSE_REPORT', {
    reportId,
    reportedItemType: reportedItemType ?? 'user',
    reason,
    reporterId: uid,
  });

  res.status(201).json({ success: true, message: 'Report submitted' });
});
