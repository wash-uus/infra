/**
 * Anomaly Detection Service
 *
 * Checks for suspicious platform activity and emits events to the `adminEvents`
 * bus (picked up by the SSE stream on the admin dashboard).
 *
 * Checks:
 *   - Refund spike       — > 5 refunds in the last hour
 *   - Abuse report spike — > 10 reports in the last hour
 *   - Conversion drop    — 24h conversion rate > 30% below 7-day average
 *   - High-value refund  — single refund > KES 50,000
 *
 * Called by the maintenance worker every 5 minutes and from relevant handlers.
 */

import { col } from '../config/firebase';
import { adminEvents } from '../controllers/admin.controller';
import { logger } from '../utils/logger';

// ── Configurable thresholds ───────────────────────────────────────────────────
const REFUND_SPIKE_THRESHOLD      = parseInt(process.env.ANOMALY_REFUND_SPIKE     ?? '5',  10);
const REPORT_SPIKE_THRESHOLD      = parseInt(process.env.ANOMALY_REPORT_SPIKE     ?? '10', 10);
const CONVERSION_DROP_PCT         = parseFloat(process.env.ANOMALY_CONVERSION_DROP ?? '0.30'); // 30%
const HIGH_VALUE_REFUND_THRESHOLD = parseFloat(process.env.ANOMALY_HIGH_REFUND     ?? '50000');

/**
 * Check for a refund spike in the last hour.
 */
export async function checkRefundSpike(): Promise<void> {
  const since = new Date(Date.now() - 3_600_000);
  const snap = await col.transactions
    .where('status', '==', 'refunded')
    .where('refundedAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= REFUND_SPIKE_THRESHOLD) {
    logger.warn('Anomaly: refund spike detected', { count, threshold: REFUND_SPIKE_THRESHOLD });
    adminEvents.emit('ANOMALY', {
      type: 'REFUND_SPIKE',
      message: `${count} refunds processed in the last hour (threshold: ${REFUND_SPIKE_THRESHOLD})`,
      severity: count >= REFUND_SPIKE_THRESHOLD * 2 ? 'critical' : 'warning',
      data: { count, threshold: REFUND_SPIKE_THRESHOLD },
      detectedAt: new Date().toISOString(),
    });
  }
}

/**
 * Check for an abuse report spike in the last hour.
 */
export async function checkAbuseReportSpike(): Promise<void> {
  const since = new Date(Date.now() - 3_600_000);
  const snap = await col.abuseReports
    .where('createdAt', '>=', since)
    .count()
    .get();

  const count = snap.data().count;
  if (count >= REPORT_SPIKE_THRESHOLD) {
    logger.warn('Anomaly: abuse report spike detected', { count, threshold: REPORT_SPIKE_THRESHOLD });
    adminEvents.emit('ANOMALY', {
      type: 'ABUSE_REPORT_SPIKE',
      message: `${count} abuse reports filed in the last hour (threshold: ${REPORT_SPIKE_THRESHOLD})`,
      severity: 'warning',
      data: { count, threshold: REPORT_SPIKE_THRESHOLD },
      detectedAt: new Date().toISOString(),
    });
  }
}

/**
 * Check if the 24-hour subscription conversion rate has dropped significantly
 * compared to the 7-day average.
 */
export async function checkConversionDrop(): Promise<void> {
  const now    = Date.now();
  const since7d  = new Date(now - 7 * 86_400_000);
  const since24h = new Date(now - 86_400_000);

  const [signups7d, paid7d, signups24h, paid24h] = await Promise.all([
    col.users.where('createdAt', '>=', since7d).count().get(),
    col.subscriptions.where('status', '==', 'completed').where('createdAt', '>=', since7d).count().get(),
    col.users.where('createdAt', '>=', since24h).count().get(),
    col.subscriptions.where('status', '==', 'completed').where('createdAt', '>=', since24h).count().get(),
  ]);

  const rate7d  = signups7d.data().count  > 0 ? paid7d.data().count  / signups7d.data().count  : 0;
  const rate24h = signups24h.data().count > 0 ? paid24h.data().count / signups24h.data().count : 0;

  if (rate7d > 0 && rate24h < rate7d * (1 - CONVERSION_DROP_PCT)) {
    const dropPct = Math.round((1 - rate24h / rate7d) * 100);
    logger.warn('Anomaly: conversion rate drop', { rate7d, rate24h, dropPct });
    adminEvents.emit('ANOMALY', {
      type: 'CONVERSION_DROP',
      message: `24h conversion rate ${(rate24h * 100).toFixed(1)}% is ${dropPct}% below 7-day avg ${(rate7d * 100).toFixed(1)}%`,
      severity: 'warning',
      data: { rate7d, rate24h, dropPct },
      detectedAt: new Date().toISOString(),
    });
  }
}

/**
 * Check if a specific refund amount is unusually high.
 * Called inline from refundTransaction handler.
 */
export function checkHighValueRefund(amount: number, currency: string, transactionId: string): void {
  if (amount >= HIGH_VALUE_REFUND_THRESHOLD) {
    logger.warn('Anomaly: high-value refund', { amount, currency, transactionId });
    adminEvents.emit('ANOMALY', {
      type: 'HIGH_VALUE_REFUND',
      message: `High-value refund of ${currency} ${amount.toLocaleString()} on transaction ${transactionId}`,
      severity: 'critical',
      data: { amount, currency, transactionId, threshold: HIGH_VALUE_REFUND_THRESHOLD },
      detectedAt: new Date().toISOString(),
    });
  }
}

/**
 * Run all periodic anomaly checks.
 * Called by the maintenance worker every 5 minutes.
 */
export async function runAllAnomalyChecks(): Promise<void> {
  await Promise.allSettled([
    checkRefundSpike(),
    checkAbuseReportSpike(),
    checkConversionDrop(),
  ]);
}
