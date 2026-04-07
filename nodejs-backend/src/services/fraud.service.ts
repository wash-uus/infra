/**
 * Fraud Detection Service
 *
 * Detects suspicious activity patterns and flags them for admin review.
 *
 * Signals checked:
 *   1. Multi-account same IP           — multiple users registered from the same IP within 24h
 *   2. Application spam                — same user applying to > N jobs within 1 hour
 *   3. Repeated refund requests        — same user/transaction pair refunded > 2x
 *   4. Rapid job postings              — same user posting > N jobs within 1 hour (bot-like)
 *
 * Results are stored in `fraudSignals` Firestore collection and emitted
 * to the admin SSE stream for real-time alerting.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db, col } from '../config/firebase';
import { adminEvents } from '../controllers/admin.controller';
import { logger } from '../utils/logger';

const APPLICATION_SPAM_THRESHOLD = parseInt(process.env.FRAUD_APP_SPAM ?? '15', 10);
const JOB_POST_SPAM_THRESHOLD    = parseInt(process.env.FRAUD_JOB_SPAM  ?? '10', 10);
const IP_ACCOUNTS_THRESHOLD      = parseInt(process.env.FRAUD_IP_ACCTS  ?? '3',  10);

// ── Signal emitter ────────────────────────────────────────────────────────────

async function recordFraudSignal(signal: {
  type: string;
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  ip?: string;
  message: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const ref = db.collection('fraudSignals').doc();
  await ref.set({
    id:        ref.id,
    ...signal,
    status:    'open',
    createdAt: FieldValue.serverTimestamp(),
  });

  adminEvents.emit('FRAUD_SIGNAL', {
    ...signal,
    signalId:   ref.id,
    detectedAt: new Date().toISOString(),
  });

  logger.warn('Fraud signal recorded', { type: signal.type, userId: signal.userId, ip: signal.ip });
}

// ── Detection checks ──────────────────────────────────────────────────────────

/**
 * Check if a new account registration from this IP is suspicious.
 * Call from the user registration handler.
 */
export async function checkMultiAccountIP(userId: string, ip: string): Promise<void> {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return; // skip localhost

  const since = new Date(Date.now() - 86_400_000);
  const snap = await col.users
    .where('registrationIp', '==', ip)
    .where('createdAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= IP_ACCOUNTS_THRESHOLD) {
    await recordFraudSignal({
      type:     'MULTI_ACCOUNT_IP',
      severity: count >= IP_ACCOUNTS_THRESHOLD * 2 ? 'high' : 'medium',
      userId,
      ip,
      message:  `${count} accounts registered from IP ${ip} in the last 24 hours`,
      data:     { count, threshold: IP_ACCOUNTS_THRESHOLD, ip },
    });
  }
}

/**
 * Check if a user is spamming job applications.
 * Call from the job application handler.
 */
export async function checkApplicationSpam(userId: string): Promise<void> {
  const since = new Date(Date.now() - 3_600_000);
  const snap = await col.jobApplications
    .where('applicantId', '==', userId)
    .where('createdAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= APPLICATION_SPAM_THRESHOLD) {
    await recordFraudSignal({
      type:     'APPLICATION_SPAM',
      severity: 'medium',
      userId,
      message:  `User ${userId} submitted ${count} job applications in the last hour`,
      data:     { count, threshold: APPLICATION_SPAM_THRESHOLD },
    });
  }
}

/**
 * Check if a user is bulk-posting jobs (bot-like pattern).
 * Call from the job creation handler.
 */
export async function checkJobPostSpam(userId: string): Promise<void> {
  const since = new Date(Date.now() - 3_600_000);
  const snap = await col.jobs
    .where('postedBy', '==', userId)
    .where('createdAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= JOB_POST_SPAM_THRESHOLD) {
    await recordFraudSignal({
      type:     'JOB_POST_SPAM',
      severity: 'medium',
      userId,
      message:  `User ${userId} posted ${count} jobs in the last hour`,
      data:     { count, threshold: JOB_POST_SPAM_THRESHOLD },
    });
  }
}

/**
 * Check for repeated refund attempts on the same user account.
 * Call from the refundTransaction handler.
 */
export async function checkRepeatedRefunds(userId: string): Promise<void> {
  const since = new Date(Date.now() - 30 * 86_400_000); // 30 days
  const snap = await col.transactions
    .where('clientId', '==', userId)
    .where('status', '==', 'refunded')
    .where('refundedAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= 3) {
    await recordFraudSignal({
      type:     'REPEATED_REFUNDS',
      severity: count >= 5 ? 'high' : 'medium',
      userId,
      message:  `User ${userId} has had ${count} refunds in the last 30 days`,
      data:     { count, userId },
    });
  }
}
