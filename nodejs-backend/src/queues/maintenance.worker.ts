/**
 * Maintenance Worker
 *
 * Handles periodic background tasks:
 *   1. Expire featured jobs/tools whose featuredUntil has passed
 *   2. Expire user subscriptions whose endDate has passed
 *   3. Clean up audit logs older than 90 days
 *   4. Run anomaly detection checks (every 5 minutes)
 *
 * All jobs are scheduled via BullMQ repeatables when Redis is available.
 * When Redis is absent, schedules are approximated with setInterval.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { col } from '../config/firebase';
import { runAllAnomalyChecks } from '../services/anomaly.service';
import { logger } from '../utils/logger';
import { getQueue } from './index';

export const MAINTENANCE_QUEUE = 'maintenance';

// ── Job processors ────────────────────────────────────────────────────────────

/** Un-feature jobs/tools whose featuredUntil timestamp has passed. */
async function expireFeaturedListings(): Promise<void> {
  const now = new Date();

  const [jobsSnap, toolsSnap] = await Promise.all([
    col.jobs.where('isFeatured', '==', true).where('featuredUntil', '<=', now).get(),
    col.tools.where('isFeatured', '==', true).where('featuredUntil', '<=', now).get(),
  ]);

  const batchSize = jobsSnap.size + toolsSnap.size;
  if (batchSize === 0) return;

  // Firestore batch max 500 writes
  const batch = col.jobs.firestore.batch();

  jobsSnap.docs.forEach((d) => {
    batch.update(d.ref, {
      isFeatured:    false,
      featuredUntil: null,
      updatedAt:     FieldValue.serverTimestamp(),
    });
  });

  toolsSnap.docs.forEach((d) => {
    batch.update(d.ref, {
      isFeatured:    false,
      featuredUntil: null,
      updatedAt:     FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info('Maintenance: expired featured listings', { jobs: jobsSnap.size, tools: toolsSnap.size });
}

/** Mark subscriptions as expired when their endDate has passed. */
async function expireSubscriptions(): Promise<void> {
  const now = new Date();

  const snap = await col.subscriptions
    .where('status', '==', 'active')
    .where('endDate', '<=', now)
    .limit(200) // process up to 200 per run to stay within Firestore limits
    .get();

  if (snap.empty) return;

  const batch = col.subscriptions.firestore.batch();

  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      status:    'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Also demote the user's subscription tier to free
    const userId = d.data().userId as string | undefined;
    if (userId) {
      batch.update(col.users.doc(userId), {
        'subscription.tier':   'free',
        'subscription.status': 'expired',
        updatedAt:             FieldValue.serverTimestamp(),
      });
    }
  });

  await batch.commit();
  logger.info('Maintenance: expired subscriptions', { count: snap.size });
}

/** Delete admin_logs documents older than 90 days. */
async function cleanOldAuditLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 86_400_000);

  const snap = await col.jobs.firestore
    .collection('admin_logs')
    .where('timestamp', '<', cutoff)
    .limit(500)
    .get();

  if (snap.empty) return;

  const batch = col.jobs.firestore.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  logger.info('Maintenance: deleted old audit logs', { count: snap.size });
}

// ── Worker registration ───────────────────────────────────────────────────────

export async function startMaintenanceWorker(): Promise<void> {
  const bullmq = await import('bullmq').catch(() => null);

  if (!bullmq || !process.env.REDIS_URL) {
    // Fallback: plain setInterval (single-instance only, acceptable for now)
    logger.warn('Maintenance worker running in setInterval mode — Redis not available');

    setInterval(() => expireFeaturedListings().catch((e: Error) => logger.error('expireFeatured error', { error: e.message })), 15 * 60 * 1_000);
    setInterval(() => expireSubscriptions().catch((e: Error) => logger.error('expireSubscriptions error', { error: e.message })), 60 * 60 * 1_000);
    setInterval(() => cleanOldAuditLogs().catch((e: Error) => logger.error('cleanAuditLogs error', { error: e.message })), 24 * 60 * 60 * 1_000);
    setInterval(() => runAllAnomalyChecks().catch((e: Error) => logger.error('anomalyChecks error', { error: e.message })), 5 * 60 * 1_000);

    return;
  }

  const connection = { url: process.env.REDIS_URL };

  const worker = new bullmq.Worker<{ task: string }>(
    MAINTENANCE_QUEUE,
    async (job) => {
      switch (job.data.task) {
        case 'expire_featured':      await expireFeaturedListings(); break;
        case 'expire_subscriptions': await expireSubscriptions();    break;
        case 'clean_audit_logs':     await cleanOldAuditLogs();      break;
        case 'anomaly_checks':       await runAllAnomalyChecks();    break;
        default:
          logger.warn('Maintenance worker: unknown task', { task: job.data.task });
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on('completed', (job) => logger.info('Maintenance job completed', { task: job.data.task }));
  worker.on('failed', (job, err) => logger.error('Maintenance job failed', { task: job?.data.task, error: err.message }));

  // Schedule repeating jobs
  const queue = await getQueue(MAINTENANCE_QUEUE);
  if (queue) {
    const schedules: Array<{ name: string; pattern: string; task: string }> = [
      { name: 'expire-featured',       pattern: '*/15 * * * *', task: 'expire_featured'      },
      { name: 'expire-subscriptions',  pattern: '0 * * * *',   task: 'expire_subscriptions' },
      { name: 'clean-audit-logs',      pattern: '0 3 * * *',   task: 'clean_audit_logs'     },
      { name: 'anomaly-checks',        pattern: '*/5 * * * *', task: 'anomaly_checks'        },
    ];

    for (const s of schedules) {
      await queue.upsertJobScheduler(s.name, { pattern: s.pattern }, { name: s.name, data: { task: s.task } })
        .catch(() => {
          // upsertJobScheduler is BullMQ 5+. Fall back gracefully on older versions.
        });
    }
  }

  logger.info('Maintenance worker started');
}
