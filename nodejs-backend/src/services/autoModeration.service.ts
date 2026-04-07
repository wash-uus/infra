/**
 * Auto-Moderation Service
 *
 * Scans user-generated content (job descriptions, tool descriptions, messages,
 * reviews) against a keyword blocklist stored in Firestore `config/moderation`.
 *
 * On a positive match:
 *   1. The content document is soft-hidden (status → 'pending_review').
 *   2. A `moderationQueue` entry is created for manual review.
 *   3. The `adminEvents` bus receives a `MODERATION_HIT` event.
 *
 * The keyword list is hot-reloadable — edit `config/moderation` in Firestore
 * and the in-memory cache expires within 5 minutes.
 *
 * Usage:
 *   const { flagged, matches } = await scanContent(text);
 *   if (flagged) await queueForModeration('job', jobId, text, matches, authorId);
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { adminEvents } from '../controllers/admin.controller';
import { logger } from '../utils/logger';

// ── Keyword cache ─────────────────────────────────────────────────────────────
let _keywords: string[]  = [];
let _lastFetched         = 0;
const CACHE_TTL_MS       = 5 * 60 * 1_000; // 5 minutes

// Default keywords used until Firestore config is loaded
const DEFAULT_KEYWORDS: string[] = [
  'scam', 'fraud', 'fake', 'spam',
  'casino', 'gambling', 'betting',
  'drugs', 'weapon', 'illegal',
];

async function getKeywords(): Promise<string[]> {
  if (Date.now() - _lastFetched < CACHE_TTL_MS && _keywords.length > 0) {
    return _keywords;
  }

  try {
    const snap = await db.collection('config').doc('moderation').get();
    if (snap.exists) {
      const data = snap.data()!;
      _keywords = (data.keywords as string[] | undefined) ?? DEFAULT_KEYWORDS;
    } else {
      _keywords = DEFAULT_KEYWORDS;
    }
    _lastFetched = Date.now();
  } catch (err: any) {
    logger.warn('Auto-moderation: failed to load keywords from Firestore', { error: err.message });
    _keywords = _keywords.length > 0 ? _keywords : DEFAULT_KEYWORDS;
  }

  return _keywords;
}

// ── Content scanning ──────────────────────────────────────────────────────────

export interface ScanResult {
  flagged: boolean;
  matches: string[];
}

/**
 * Scan a text string for prohibited keywords.
 * Returns flagged=true and the list of matched terms.
 */
export async function scanContent(text: string): Promise<ScanResult> {
  if (!text || text.trim().length === 0) return { flagged: false, matches: [] };

  const keywords = await getKeywords();
  const lower    = text.toLowerCase();
  const matches  = keywords.filter((kw) => lower.includes(kw.toLowerCase()));

  return { flagged: matches.length > 0, matches };
}

// ── Moderation queue management ───────────────────────────────────────────────

export type ContentType = 'job' | 'tool' | 'review' | 'message' | 'profile';

/**
 * Soft-hide content and add it to the moderation queue.
 * Also emits a real-time event to the admin SSE stream.
 */
export async function queueForModeration(
  type: ContentType,
  targetId: string,
  contentSnippet: string,
  matches: string[],
  authorId?: string,
): Promise<void> {
  const collMap: Record<ContentType, FirebaseFirestore.CollectionReference | null> = {
    job:     db.collection('jobs'),
    tool:    db.collection('tools'),
    review:  db.collection('reviews'),
    message: db.collection('messages'),
    profile: db.collection('users'),
  };

  // Soft-hide the content document
  const coll = collMap[type];
  if (coll) {
    await coll.doc(targetId).update({
      status:    'pending_review',
      hiddenAt:  FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {
      // Document may not have a status field — non-fatal
    });
  }

  // Create moderation queue entry
  const queueRef = db.collection('moderationQueue').doc();
  await queueRef.set({
    id:             queueRef.id,
    type,
    targetId,
    contentSnippet: contentSnippet.slice(0, 500), // cap at 500 chars
    flaggedKeywords: matches,
    authorId:       authorId ?? null,
    status:         'pending_review',
    source:         'auto',
    createdAt:      FieldValue.serverTimestamp(),
    updatedAt:      FieldValue.serverTimestamp(),
  });

  // Notify admin SSE stream
  adminEvents.emit('MODERATION_HIT', {
    type,
    targetId,
    matches,
    queueId:   queueRef.id,
    detectedAt: new Date().toISOString(),
  });

  logger.info('Auto-moderation: content flagged', { type, targetId, matches });
}

/**
 * Convenience function: scan and queue in one call.
 * Returns true if the content was flagged.
 */
export async function autoModerate(
  type: ContentType,
  targetId: string,
  text: string,
  authorId?: string,
): Promise<boolean> {
  const { flagged, matches } = await scanContent(text);
  if (flagged) {
    await queueForModeration(type, targetId, text, matches, authorId);
  }
  return flagged;
}
