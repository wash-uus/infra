import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col } from '../config/firebase';
import { AuthRequest, Conversation, Message } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { getEffectiveTier, FREE_CONVERSATION_LIMIT } from '../utils/subscription';

// ── Get or create a conversation ──────────────────────────────────────────────
export const startConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { participantId, jobId, toolId } = req.body;

  if (!participantId || participantId === uid) {
    throw new ForbiddenError('Invalid participant');
  }

  const participants = [uid, participantId].sort();

  // Derive a deterministic conversation ID so that concurrent requests from
  // both sides of the conversation always converge on the same document path.
  // Random uuidv4 would create duplicate conversations under concurrent calls.
  const contextSuffix = jobId ? `_j_${jobId}` : toolId ? `_t_${toolId}` : '';
  const convId = `conv_${participants[0]}_${participants[1]}${contextSuffix}`;

  // Read participant profiles outside the transaction (user docs are not
  // modified here so there is no write dependency).
  const [requesterDoc, participantDoc] = await Promise.all([
    col.users.doc(uid).get(),
    col.users.doc(participantId).get(),
  ]);

  const requesterData = requesterDoc.data();
  const participantData = participantDoc.data();

  // Gate: free tier max concurrent conversations
  const requesterTier = getEffectiveTier(requesterData ?? {});
  if (requesterTier === 'free') {
    const existingConvCount = await col.conversations
      .where('participants', 'array-contains', uid)
      .get();
    if (existingConvCount.size >= FREE_CONVERSATION_LIMIT) {
      col.conversionEvents.add({
        type: 'limit_hit',
        context: 'start_conversation',
        userId: uid,
        currentTier: requesterTier,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
      res.status(402).json({
        success: false,
        code: 'CONVERSATION_LIMIT',
        message: `Free plan allows up to ${FREE_CONVERSATION_LIMIT} conversations. Upgrade to Pro for unlimited messaging.`,
      });
      return;
    }
  }

  const now = FieldValue.serverTimestamp();

  const conversation: Omit<Conversation, 'id'> = {
    participants,
    participantNames: {
      [uid]: requesterData?.displayName ?? '',
      [participantId]: participantData?.displayName ?? '',
    },
    participantPhotos: {
      [uid]: requesterData?.photoURL ?? '',
      [participantId]: participantData?.photoURL ?? '',
    },
    jobId,
    toolId,
    unreadCounts: { [uid]: 0, [participantId]: 0 },
    createdAt: now as any,
    updatedAt: now as any,
  };

  // Atomic create-or-return: the Firestore transaction guarantees that only one
  // concurrent request can write the document — the other will read the existing one.
  const { data: finalData, isNew } = await col.conversations
    .firestore
    .runTransaction(async (txn) => {
      const existing = await txn.get(col.conversations.doc(convId));
      if (existing.exists) {
        return { data: { id: existing.id, ...existing.data() }, isNew: false };
      }
      txn.set(col.conversations.doc(convId), conversation);
      return { data: { id: convId, ...conversation }, isNew: true };
    });

  res.status(isNew ? 201 : 200).json({ success: true, data: finalData });
});

// ── List my conversations ──────────────────────────────────────────────────────
export const listConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.conversations
    .where('participants', 'array-contains', uid)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  const convs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: convs });
});

// ── Get single conversation ────────────────────────────────────────────────────
export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.conversations.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Conversation');

  const conv = doc.data() as Conversation;
  if (!conv.participants.includes(uid)) throw new ForbiddenError();

  res.json({ success: true, data: { ...conv, id: doc.id } });
});

// ── Send message ───────────────────────────────────────────────────────────────
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const { content, attachmentUrl, attachmentType } = req.body;

  const convDoc = await col.conversations.doc(id).get();
  if (!convDoc.exists) throw new NotFoundError('Conversation');

  const conv = convDoc.data() as Conversation;
  if (!conv.participants.includes(uid)) throw new ForbiddenError();

  const userDoc = await col.users.doc(uid).get();
  const userData = userDoc.data();

  // Gate: free tier cannot send messages (they can receive, not reply)
  const senderTier = getEffectiveTier(userData ?? {});
  if (senderTier === 'free') {
    col.conversionEvents.add({
      type: 'limit_hit',
      context: 'send_message',
      userId: uid,
      currentTier: senderTier,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
    res.status(402).json({
      success: false,
      code: 'MESSAGING_GATED',
      message: 'Free plan members can receive messages but cannot reply. Upgrade to Pro to unlock full messaging.',
    });
    return;
  }

  const msgId = uuidv4();
  const now = FieldValue.serverTimestamp();

  const message: Omit<Message, 'id'> = {
    conversationId: id,
    senderId: uid,
    senderName: userData?.displayName ?? '',
    senderPhoto: userData?.photoURL,
    content,
    attachmentUrl,
    attachmentType,
    isRead: false,
    readBy: [uid],
    createdAt: now as any,
  };

  // Compute unread increments for other participants
  const unreadUpdates: Record<string, FirebaseFirestore.FieldValue> = {};
  for (const pid of conv.participants) {
    if (pid !== uid) {
      unreadUpdates[`unreadCounts.${pid}`] = FieldValue.increment(1);
    }
  }

  await Promise.all([
    col.conversations.doc(id).collection('messages').doc(msgId).set(message),
    col.conversations.doc(id).update({
      lastMessage: content,
      lastMessageAt: now,
      lastMessageBy: uid,
      updatedAt: now,
      ...unreadUpdates,
    }),
  ]);

  res.status(201).json({ success: true, data: { id: msgId, ...message } });
});

// ── Get messages in a conversation ────────────────────────────────────────────
export const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const { cursor, pageSize = '30' } = req.query as Record<string, string>;

  const convDoc = await col.conversations.doc(id).get();
  if (!convDoc.exists) throw new NotFoundError('Conversation');
  const conv = convDoc.data() as Conversation;
  if (!conv.participants.includes(uid)) throw new ForbiddenError();

  const limit = Math.min(parseInt(pageSize, 10), 100);
  let query: FirebaseFirestore.Query = col.conversations
    .doc(id)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (cursor) {
    const cursorDoc = await col.conversations.doc(id).collection('messages').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();

  res.json({ success: true, data: messages, hasMore: snapshot.docs.length === limit });
});

// ── Mark conversation as read ──────────────────────────────────────────────────
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const convDoc = await col.conversations.doc(id).get();
  if (!convDoc.exists) throw new NotFoundError('Conversation');
  const conv = convDoc.data() as Conversation;
  if (!conv.participants.includes(uid)) throw new ForbiddenError();

  await col.conversations.doc(id).update({
    [`unreadCounts.${uid}`]: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true });
});

// ── Get total unread count ─────────────────────────────────────────────────────
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.conversations
    .where('participants', 'array-contains', uid)
    .get();

  let total = 0;
  for (const doc of snapshot.docs) {
    const conv = doc.data() as Conversation;
    total += conv.unreadCounts?.[uid] ?? 0;
  }

  res.json({ success: true, data: { unreadCount: total } });
});
