/**
 * Messages Service
 * Handles all Firestore operations for messages and conversations.
 * 
 * API:
 * - saveMessage: Persist a message to Firestore + update conversation
 * - loadMessageHistory: Fetch messages from a conversation
 * - markMessageRead: Mark a message as read by a user  
 * - updateMessageStatus: Update message delivery/read status
 */

import { getDb } from './firebase';
import { logger } from './logger';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface MessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  readBy: string[];
  createdAt: Timestamp;
}

/**
 * Save a message to Firestore and update the conversation metadata.
 * Returns the saved message with ID and timestamp.
 */
export async function saveMessage(payload: MessagePayload): Promise<StoredMessage> {
  const db = getDb();
  const messageId = uuidv4();
  const now = Timestamp.now();

  const messageDoc = {
    id: messageId,
    conversationId: payload.conversationId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderPhoto: payload.senderPhoto ?? undefined,
    content: payload.content,
    attachmentUrl: payload.attachmentUrl ?? undefined,
    attachmentType: payload.attachmentType ?? undefined,
    isRead: false,
    readBy: [payload.senderId], // Sender has "read" their own message
    createdAt: now,
  };

  try {
    // Use batch to atomically save message + update conversation
    const batch = db.batch();

    // Save message to subcollection
    const messageRef = db
      .collection('conversations')
      .doc(payload.conversationId)
      .collection('messages')
      .doc(messageId);
    batch.set(messageRef, messageDoc);

    // Update conversation metadata
    const conversationRef = db.collection('conversations').doc(payload.conversationId);
    batch.update(conversationRef, {
      lastMessage: payload.content.substring(0, 200), // Store first 200 chars
      lastMessageAt: now,
      lastMessageBy: payload.senderId,
      updatedAt: now,
    });

    await batch.commit();

    logger.debug('Message saved', {
      messageId,
      conversationId: payload.conversationId,
      senderId: payload.senderId,
    });

    return { ...messageDoc, createdAt: now };
  } catch (err: unknown) {
    logger.error('Failed to save message', {
      conversationId: payload.conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Load message history for a conversation.
 * Returns up to `limit` most recent messages, optionally before a cursor.
 */
export async function loadMessageHistory(
  conversationId: string,
  limit: number = 50,
  beforeTwoAgo?: Timestamp,
): Promise<StoredMessage[]> {
  const db = getDb();

  try {
    let query = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (beforeTwoAgo) {
      query = query.endBefore(beforeTwoAgo);
    }

    const snapshot = await query.get();
    const messages = snapshot.docs
      .map((doc) => ({ ...doc.data() } as StoredMessage))
      .reverse(); // Reverse to get chronological order

    logger.debug('Loaded message history', {
      conversationId,
      count: messages.length,
    });

    return messages;
  } catch (err: unknown) {
    logger.error('Failed to load message history', {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Mark a message as read by a user.
 * Atomically updates the message's readBy array and isRead flag.
 */
export async function markMessageRead(
  conversationId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  try {
    const messageRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId);

    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      logger.warn('Message not found', { messageId, conversationId });
      return;
    }

    // Use arrayUnion for an atomic add — eliminates the read-modify-write TOCTOU
    // race where two concurrent markRead calls could each read the same stale
    // readBy array and both overwrite with only one userId added.
    // arrayUnion is idempotent: adding an already-present userId is a no-op.
    await messageRef.update({
      readBy:    FieldValue.arrayUnion(userId),
      isRead:    true,
      updatedAt: Timestamp.now(),
    });

    logger.debug('Message marked read', {
      messageId,
      conversationId,
      userId,
    });
  } catch (err: unknown) {
    logger.error('Failed to mark message read', {
      messageId,
      conversationId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't throw — read status is not critical
  }
}

/**
 * Update conversation unread count for a user.
 * Called when user joins conversation or marks messages read.
 * Uses Firestore count() aggregation to avoid full-collection scans.
 */
export async function updateUnreadCount(
  conversationId: string,
  userId: string,
): Promise<number> {
  const db = getDb();

  try {
    // Count total messages and messages already read, then subtract.
    // Two count() aggregation RPCs are far cheaper than fetching all docs.
    const base = db.collection('conversations').doc(conversationId).collection('messages');

    const [totalSnap, readSnap] = await Promise.all([
      base.count().get(),
      base.where('readBy', 'array-contains', userId).count().get(),
    ]);

    const unreadCount = totalSnap.data().count - readSnap.data().count;

    // Update conversation metadata
    await db.collection('conversations').doc(conversationId).update({
      [`unreadCounts.${userId}`]: unreadCount,
    });

    logger.debug('Unread count updated', { conversationId, userId, count: unreadCount });

    return unreadCount;
  } catch (err: unknown) {
    logger.warn('Failed to update unread count', {
      conversationId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Get a conversation with participants info.
 * Used when a user joins to validate they're a participant.
 */
export async function getConversation(
  conversationId: string,
): Promise<{
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
} | null> {
  const db = getDb();

  try {
    const doc = await db.collection('conversations').doc(conversationId).get();
    if (!doc.exists) {
      logger.warn('Conversation not found', { conversationId });
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      participants: data?.participants ?? [],
      participantNames: data?.participantNames ?? {},
    };
  } catch (err: unknown) {
    logger.error('Failed to get conversation', {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
