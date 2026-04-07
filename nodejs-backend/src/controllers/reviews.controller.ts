import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FieldValue } from 'firebase-admin/firestore';
import { col, db } from '../config/firebase';
import { AuthRequest, Review } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

// ── Create review ─────────────────────────────────────────────────────────────
export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const {
    reviewedUserId, jobId, toolId, transactionId,
    reviewType, rating, title, comment,
    communicationRating, qualityRating, timelinessRating,
  } = req.body;

  if (uid === reviewedUserId) throw new ForbiddenError('Cannot review yourself');

  const userDoc = await col.users.doc(uid).get();
  const userData = userDoc.data();

  // For transaction-anchored reviews use a deterministic ID so concurrent
  // requests converge on the same document and the Firestore transaction's
  // existence check acts as an atomic deduplication lock.
  const reviewId = transactionId ? `rev_${uid}_${transactionId}` : uuidv4();
  const now = FieldValue.serverTimestamp();

  const review: Omit<Review, 'id'> = {
    reviewerId: uid,
    reviewerName: userData?.displayName ?? '',
    reviewerPhoto: userData?.photoURL,
    reviewedUserId,
    jobId,
    toolId,
    transactionId,
    reviewType: reviewType ?? 'general',
    rating: Math.min(5, Math.max(1, Number(rating))),
    title,
    comment,
    communicationRating,
    qualityRating,
    timelinessRating,
    isVerified: !!transactionId,
    isFlagged: false,
    createdAt: now as any,
    updatedAt: now as any,
  };

  const reviewedUserRef = col.users.doc(reviewedUserId);

  // Atomic: check for duplicate + write review + update reviewer's rating stats
  // in a single Firestore transaction.  Without this, concurrent submissions
  // could both pass the duplicate check and inflate averageRating.
  const alreadyExists = await db.runTransaction(async (tx) => {
    const [existingSnap, reviewedUserSnap] = await Promise.all([
      tx.get(col.reviews.doc(reviewId)),
      tx.get(reviewedUserRef),
    ]);

    if (existingSnap.exists) return true; // duplicate — abort writes

    tx.set(col.reviews.doc(reviewId), review);

    // Incremental O(1) rating update
    const reviewedData = reviewedUserSnap.data();
    const oldCount  = (reviewedData?.totalReviews  as number) || 0;
    const oldAvg    = (reviewedData?.averageRating  as number) || 0;
    const newCount  = oldCount + 1;
    const newAvg    = ((oldAvg * oldCount) + Number(rating)) / newCount;
    tx.update(reviewedUserRef, {
      averageRating: parseFloat(newAvg.toFixed(2)),
      totalReviews:  newCount,
      updatedAt:     now,
    });

    return false;
  });

  if (alreadyExists) throw new ForbiddenError('You have already reviewed this transaction');

  res.status(201).json({ success: true, data: { id: reviewId, ...review } });
});

// ── List reviews for a user ───────────────────────────────────────────────────
export const getUserReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const snapshot = await col.reviews
    .where('reviewedUserId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ success: true, data: reviews });
});

// ── Get review stats for a user ───────────────────────────────────────────────
export const getUserReviewStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const snapshot = await col.reviews.where('reviewedUserId', '==', userId).get();
  const reviews = snapshot.docs.map((d) => d.data() as Review);

  if (reviews.length === 0) {
    res.json({ success: true, data: { averageRating: 0, totalReviews: 0, distribution: {} } });
    return;
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of reviews) {
    const star = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] ?? 0) + 1;
    total += r.rating;
  }

  res.json({
    success: true,
    data: {
      averageRating: parseFloat((total / reviews.length).toFixed(2)),
      totalReviews: reviews.length,
      distribution,
    },
  });
});

// ── List reviews for a job ────────────────────────────────────────────────────
export const getJobReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;
  const snapshot = await col.reviews
    .where('jobId', '==', jobId)
    .orderBy('createdAt', 'desc')
    .get();
  res.json({ success: true, data: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) });
});

// ── Respond to a review ───────────────────────────────────────────────────────
export const respondToReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;
  const { response } = req.body;

  const doc = await col.reviews.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Review');
  const review = doc.data() as Review;
  if (review.reviewedUserId !== uid) throw new ForbiddenError();

  await col.reviews.doc(id).update({
    response,
    responseDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ success: true });
});

// ── Flag a review (admin) ─────────────────────────────────────────────────────
export const flagReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.['role'] !== 'admin') throw new ForbiddenError();
  const { id } = req.params;
  const doc = await col.reviews.doc(id).get();
  if (!doc.exists) throw new NotFoundError('Review');
  await col.reviews.doc(id).update({ isFlagged: true, updatedAt: FieldValue.serverTimestamp() });
  res.json({ success: true });
});
