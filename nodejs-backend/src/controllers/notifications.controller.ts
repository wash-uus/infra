import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col, db, fcm } from '../config/firebase';
import { AuthRequest, Notification } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

// ── Send a notification (internal helper) ────────────────────────────────────
// Writes the notification document and atomically increments the denormalized
// unreadNotificationCount on the user record so clients can read a cheap integer
// instead of running an O(n) count query.
export async function sendNotification(
  recipientId: string,
  payload: Omit<Notification, 'id' | 'isRead' | 'createdAt'>,
): Promise<void> {
  const notifId = uuidv4();
  const batch = db.batch();

  // Write notification document
  batch.set(col.notifications.doc(notifId), {
    ...payload,
    id: notifId,
    recipientId,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Increment denormalized counter — cheap O(1) read for unread badge
  batch.update(col.users.doc(recipientId), {
    unreadNotificationCount: FieldValue.increment(1),
  });

  await batch.commit();

  // Optionally send FCM push notification (fire-and-forget)
  const userDoc = await col.users.doc(recipientId).get();
  const fcmToken = userDoc.data()?.fcmToken;
  if (fcmToken) {
    await fcm.send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    }).catch(() => {
      // Ignore push failures — in-app notification was already saved
    });
  }
}

// ── List my notifications ─────────────────────────────────────────────────────
export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { unreadOnly, cursor, pageSize = '30' } = req.query as Record<string, string>;

  let query: FirebaseFirestore.Query = col.notifications
    .where('recipientId', '==', uid);

  if (unreadOnly === 'true') query = query.where('isRead', '==', false);

  query = query
    .orderBy('createdAt', 'desc')
    .limit(Math.min(parseInt(pageSize, 10), 100));

  if (cursor) {
    const cursorDoc = await col.notifications.doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  res.json({ success: true, data: notifs, hasMore: notifs.length === Math.min(parseInt(pageSize, 10), 100) });
});

// ── Get unread count — reads the denormalized integer on the user doc (O(1)) ──
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const userDoc = await col.users.doc(uid).get();
  const count = (userDoc.data()?.unreadNotificationCount as number) ?? 0;
  res.json({ success: true, data: { unreadCount: Math.max(0, count) } });
});

// ── Mark single notification read ────────────────────────────────────────────
export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const doc = await col.notifications.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Notification');
  const notif = doc.data() as Notification;
  if (notif.recipientId !== uid) throw new ForbiddenError();
  if (notif.isRead) {
    res.json({ success: true });
    return;
  }

  // Atomically mark read and decrement counter
  const batch = db.batch();
  batch.update(col.notifications.doc(id), { isRead: true });
  batch.update(col.users.doc(uid), {
    unreadNotificationCount: FieldValue.increment(-1),
  });
  await batch.commit();

  res.json({ success: true });
});

// ── Mark all notifications read ───────────────────────────────────────────────
export const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const snapshot = await col.notifications
    .where('recipientId', '==', uid)
    .where('isRead', '==', false)
    .get();

  if (snapshot.empty) {
    res.json({ success: true, updated: 0 });
    return;
  }

  // Batch update: mark all unread docs as read and decrement the denormalized
  // counter by exactly the number of docs we're marking, rather than hard-resetting
  // to 0 — this preserves notifications that arrived during the read→write window.
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { isRead: true });
  }
  batch.update(col.users.doc(uid), {
    unreadNotificationCount: FieldValue.increment(-snapshot.size),
  });
  await batch.commit();

  res.json({ success: true, updated: snapshot.size });
});

// ── Save FCM token ────────────────────────────────────────────────────────────
export const saveFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { fcmToken } = req.body;
  await col.users.doc(uid).update({ fcmToken });
  res.json({ success: true });
});

