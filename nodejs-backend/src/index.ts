import 'dotenv/config';

// ── Cloud Trace — must be the very first import in production ─────────────────
// The trace agent monkey-patches Node.js core HTTP, net, and popular libraries
// (express, ioredis, @google-cloud/*) to inject W3C traceparent context.
// It is a no-op in dev / CI (CLOUD_TRACE_ENABLED is falsy by default).
if (process.env.CLOUD_TRACE_ENABLED === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@google-cloud/trace-agent').start({
    projectId:       process.env.GCP_PROJECT_ID,
    samplingRate:    parseFloat(process.env.TRACE_SAMPLE_RATE ?? '0.1'), // 10%
    ignoreUrls:      ['/health'],
    ignoreAgents:    ['GoogleHC/1.0'],                                    // GCP LB health probes
    serviceContext: {
      service: 'infra-api',
      version: process.env.K_REVISION ?? 'local',
    },
  });
}

// ── Sentry must be initialised before any other imports ──────────────────────
// Instrumentation is no-op when SENTRY_DSN is absent (dev/CI environments).
if (process.env.SENTRY_DSN) {
  // Dynamic import keeps Sentry out of the critical path if the package is absent
  import('@sentry/node').then(({ init, httpIntegration, expressErrorHandler }) => {
    init({
      dsn: process.env.SENTRY_DSN,
      environment:      process.env.NODE_ENV ?? 'production',
      tracesSampleRate: 0.1,   // 10 % of requests sampled for performance traces
      integrations: [httpIntegration()],
    });
  }).catch(() => {
    // @sentry/node not installed — silently skip
  });
}

import { Socket } from 'net';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initRedis, closeRedis } from './config/redis';
import { closePubSub } from './events/publisher';
import { ensureCollections } from './utils/search';
import { startNotificationsWorker } from './queues/notifications.queue';
import { startImagesWorker } from './queues/images.queue';
import { startMaintenanceWorker } from './queues/maintenance.worker';
import { startReconciliationWorker } from './queues/reconciliation.worker';
import { startSubscribers, stopSubscribers } from './events/subscriber';
import { dlqHandlerFor } from './events/handlers/dlq.handler';
import { registerHandler } from './events/subscriber';

// ── Pub/Sub worker registration ───────────────────────────────────────────────
// Handlers must be imported before startSubscribers() so their top-level
// registerHandler() calls are executed. DLQ handlers are registered explicitly
// below since they use a factory pattern.
import './events/handlers/notification.handler';
import './events/handlers/contract.handler';
import './events/handlers/matching.handler';

// DLQ subscriptions — one per main subscription topic
const DLQ_SUBSCRIPTIONS = [
  'notification-trigger-sub.dlq-sub',
  'contract-events-sub.dlq-sub',
  'contract-completed-sub.dlq-sub',
  'user-created-sub.dlq-sub',
  'user-updated-sub.dlq-sub',
  'project-created-sub.dlq-sub',
  'project-created-matching-sub.dlq-sub',
  'project-updated-sub.dlq-sub',
  'bid-placed-sub.dlq-sub',
  'bid-accepted-sub.dlq-sub',
  'payment-completed-sub.dlq-sub',
] as const;

for (const sub of DLQ_SUBSCRIPTIONS) {
  registerHandler({ subscriptionName: sub, handler: dlqHandlerFor(sub) });
}

// ── Unhandled promise rejections ──────────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection — shutting down', {
    errorName: err.name,
    message:   err.message,
    stack:     err.stack,
  });
  server.close(() => process.exit(1));
});

// ── Uncaught synchronous exceptions ──────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — shutting down', {
    errorName: err.name,
    message:   err.message,
    stack:     err.stack,
  });
  setTimeout(() => process.exit(1), 500).unref();
});

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info(`INFRA API started`, { port: env.PORT, env: env.NODE_ENV });

  // Warn if Typesense is not configured so operators know search quality is degraded.
  // The system gracefully falls back to Firestore prefix queries, but this is O(N)
  // and less accurate. Configure TYPESENSE_HOST + TYPESENSE_API_KEY for production.
  if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    logger.warn('Typesense is not configured (TYPESENSE_HOST / TYPESENSE_API_KEY missing). Full-text search is falling back to Firestore prefix queries. Set both env vars for production-grade search.');
  }

  // Warm up shared Redis connection so rate limiters and cache are ready ASAP
  initRedis().catch((err) =>
    logger.warn('Redis init failed — degraded mode active', { error: err?.message }),
  );

  // Initialize background services (non-blocking; log errors but don't crash)
  ensureCollections().catch((err) =>
    logger.warn('Typesense schema init failed', { error: err?.message }),
  );
  startNotificationsWorker().catch((err) =>
    logger.warn('Notifications worker start failed', { error: err?.message }),
  );
  startImagesWorker().catch((err) =>
    logger.warn('Images worker start failed', { error: err?.message }),
  );
  startMaintenanceWorker().catch((err) =>
    logger.warn('Maintenance worker start failed', { error: err?.message }),
  );
  startReconciliationWorker().catch((err) =>
    logger.warn('Reconciliation worker start failed', { error: err?.message }),
  );

  // ── Pub/Sub worker mode ───────────────────────────────────────────────────
  // Set PUBSUB_WORKER=true on a dedicated Cloud Run revision to activate
  // Pub/Sub pull subscribers. Keep it unset on the main API revision so
  // subscriber latency never affects request handling.
  if (process.env.PUBSUB_WORKER === 'true') {
    startSubscribers().catch((err) =>
      logger.warn('Pub/Sub subscriber start failed', { error: err?.message }),
    );
  }
});

// ── Keep-alive tuning ─────────────────────────────────────────────────────────
// keepAliveTimeout must exceed the upstream load-balancer idle timeout (60 s on
// Railway / GCP / AWS ALB) so the LB never closes a connection the server still
// considers open — which causes sporadic 502s under load.
server.keepAliveTimeout = 65_000;  // 65 s > LB 60 s
server.headersTimeout   = 66_000;  // must be > keepAliveTimeout

// ── Connection tracking for graceful drain ────────────────────────────────────
const openConnections = new Set<Socket>();

server.on('connection', (socket: Socket) => {
  openConnections.add(socket);
  socket.on('close', () => openConnections.delete(socket));
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`${signal} received — draining ${openConnections.size} open connection(s)`);

  // Stop accepting new connections immediately.
  server.close(async () => {
    // Cleanly disconnect Prisma, Redis, and Pub/Sub before exit
    const { prisma } = await import('./config/database');
    await Promise.allSettled([
      prisma.$disconnect(),
      closeRedis(),
      closePubSub(),
      stopSubscribers(),
    ]);
    logger.info('All connections closed — exiting cleanly');
    process.exit(0);
  });

  // Force-destroy any lingering keep-alive connections after 10 s so the
  // process doesn't get stuck blocking a rolling deploy.
  setTimeout(() => {
    logger.warn('Forcing close of remaining connections after 10 s drain');
    openConnections.forEach((socket) => socket.destroy());
    process.exit(0);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

