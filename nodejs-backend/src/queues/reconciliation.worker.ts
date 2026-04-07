/**
 * Reconciliation Worker
 *
 * Runs once per day (scheduled via BullMQ repeat) to verify that the Firestore
 * ledger balance matches the sum of completed/released transactions stored in
 * Firestore.  Discrepancies are flagged to the `adminEvents` bus (picked up by
 * the SSE stream) and written to `reconciliationReports` in Firestore.
 *
 * Schedule: daily at 02:00 UTC via enqueueReconciliation().
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db, col } from '../config/firebase';
import { sumLedgerWindow, getLedgerBalance } from '../services/ledger.service';
import { adminEvents } from '../controllers/admin.controller';
import { logger } from '../utils/logger';
import { getQueue } from './index';

export const RECONCILIATION_QUEUE = 'reconciliation';

export interface ReconciliationJobData {
  date: string; // ISO date string (YYYY-MM-DD) of the day to reconcile
}

/**
 * Run the daily reconciliation check for a given calendar day.
 */
export async function runReconciliation(date: string): Promise<void> {
  const since = new Date(`${date}T00:00:00.000Z`);
  const until = new Date(since.getTime() + 86_400_000);

  logger.info('Reconciliation started', { date });

  // Sum ledger entries for the day
  const ledger = await sumLedgerWindow(since, until);

  // Sum Firestore transactions for the same window
  const txSnap = await col.transactions
    .where('status', 'in', ['completed', 'released'])
    .where('createdAt', '>=', since)
    .where('createdAt', '<', until)
    .get();

  let txTotal = 0;
  txSnap.docs.forEach((d) => {
    txTotal += (d.data().amount as number | undefined) ?? 0;
  });
  txTotal = Math.round(txTotal * 100) / 100;

  // Sum subscription payments for the same window
  const subsSnap = await col.subscriptions
    .where('status', '==', 'completed')
    .where('createdAt', '>=', since)
    .where('createdAt', '<', until)
    .get();

  let subsTotal = 0;
  subsSnap.docs.forEach((d) => {
    subsTotal += (d.data().amount as number | undefined) ?? 0;
  });
  subsTotal = Math.round(subsTotal * 100) / 100;

  const expectedCredits = Math.round((txTotal + subsTotal) * 100) / 100;
  const discrepancy     = Math.round(Math.abs(ledger.totalCredits - expectedCredits) * 100) / 100;
  const isMatch         = discrepancy < 0.01; // allow 1¢ floating point tolerance

  // Current running balance for snapshot
  const { balance: runningBalance } = await getLedgerBalance();

  const report = {
    date,
    since:              since.toISOString(),
    until:              until.toISOString(),
    ledgerCredits:      ledger.totalCredits,
    ledgerDebits:       ledger.totalDebits,
    ledgerNet:          ledger.net,
    ledgerEntries:      ledger.entriesCount,
    transactionRevenue: txTotal,
    subscriptionRevenue: subsTotal,
    expectedCredits,
    discrepancy,
    status:             isMatch ? 'ok' : 'discrepancy',
    runningBalance,
    createdAt:          FieldValue.serverTimestamp(),
  };

  // Write report to Firestore
  await db.collection('reconciliationReports').doc(date).set(report);

  if (!isMatch) {
    logger.error('Reconciliation discrepancy detected', { date, discrepancy, ledgerCredits: ledger.totalCredits, expectedCredits });

    // Emit to SSE admin stream
    adminEvents.emit('RECONCILIATION_DISCREPANCY', {
      date,
      discrepancy,
      ledgerCredits: ledger.totalCredits,
      expectedCredits,
    });
  } else {
    logger.info('Reconciliation OK', { date, credits: ledger.totalCredits, debits: ledger.totalDebits });
  }
}

/**
 * Start the reconciliation BullMQ worker.
 * Called from the main index.ts startup.
 */
export async function startReconciliationWorker(): Promise<void> {
  const bullmq = await import('bullmq').catch(() => null);
  if (!bullmq || !process.env.REDIS_URL) {
    logger.warn('Reconciliation worker disabled — Redis not available');
    return;
  }

  const connection = { url: process.env.REDIS_URL };

  const worker = new bullmq.Worker<ReconciliationJobData>(
    RECONCILIATION_QUEUE,
    async (job) => {
      await runReconciliation(job.data.date);
    },
    { connection, concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('Reconciliation job completed', { jobId: job.id, date: job.data.date });
  });
  worker.on('failed', (job, err) => {
    logger.error('Reconciliation job failed', { jobId: job?.id, error: err.message });
  });

  // Schedule daily at 02:00 UTC
  const queue = await getQueue(RECONCILIATION_QUEUE);
  if (queue) {
    await queue.upsertJobScheduler(
      'daily-reconciliation',
      { pattern: '0 2 * * *' },
      {
        name: 'daily-reconciliation',
        data: { date: new Date().toISOString().slice(0, 10) },
      },
    ).catch(() => {
      // upsertJobScheduler is BullMQ 5+; fall back to silent no-op on older versions
    });
  }

  logger.info('Reconciliation worker started');
}
