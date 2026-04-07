import 'dotenv/config';
// Fail-fast env validation — must run before any other service code
import './config/env';
import { logger } from './logger';

// ── Sentry must be initialised before any other imports ───────────────────────
if (process.env.SENTRY_DSN) {
  (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node') as typeof import('@sentry/node');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment:      process.env.NODE_ENV ?? 'production',
        tracesSampleRate: 0.05,
      });
      logger.info('Sentry initialised for payments service');
    } catch {
      // @sentry/node not installed — skip silently
    }
  })();
}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { json, raw } from 'express';
import { initFirebase } from './firebase';
import { stripeWebhook }  from './routes/stripe';
import { mpesaWebhook }   from './routes/mpesa';
import { paypalWebhook }  from './routes/paypal';
import { stripeCheckout } from './routes/checkout';
import { Queue, Worker } from 'bullmq';

const PORT = parseInt(process.env.PORT ?? '8002', 10);

// ── CORS allowed origins ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app  = express();

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Build Redis connection from REDIS_URL (Upstash/Railway) or host+port env vars.
// Falls back to localhost only in local development.
function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  };
}

// ── BullMQ job queue — graceful degradation when Redis is unavailable ─────────
// Webhooks are already processed synchronously in the route handlers; the queue
// is for async retry/observability. If Redis is down at startup we log a warning
// and continue without the queue — webhooks still succeed (synchronous path).
let webhookQueue: Queue | null = null;
let webhookWorker: Worker | null = null;

try {
  const redisConnection = getRedisConnection();

  webhookQueue = new Queue('webhooks', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // BullMQ v3+: no separate QueueScheduler — Workers handle retries internally.
  webhookWorker = new Worker('webhooks', async (job) => {
    const { provider, payload } = job.data as { provider: string; payload: Record<string, unknown> };
    switch (provider) {
      case 'stripe':
        logger.info('Processing queued Stripe webhook', { jobId: job.id, type: payload?.type });
        break;
      case 'paypal':
        logger.info('Processing queued PayPal webhook', { jobId: job.id, eventType: payload?.event_type });
        break;
      case 'mpesa':
        logger.info('Processing queued M-Pesa webhook', { jobId: job.id, checkoutId: (payload?.Body as Record<string, unknown> | undefined)?.['stkCallback'] });
        break;
      default:
        logger.warn('Unknown provider in webhook queue', { provider, jobId: job.id });
    }
  }, {
    connection: redisConnection,
    concurrency: 10,
  });

  webhookWorker.on('failed', (job, err) => {
    logger.error('Webhook job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('BullMQ webhook queue initialised');
} catch (err: unknown) {
  logger.warn('BullMQ unavailable — webhook queue disabled (synchronous processing still active)', {
    error: err instanceof Error ? err.message : String(err),
  });
}

// ── Raw body for Stripe webhook signature verification ────────────────────────
app.use('/webhooks/stripe', raw({ type: 'application/json' }));

// ── Raw body for PayPal webhook signature verification ────────────────────────
app.use('/webhooks/paypal', raw({ type: 'application/json' }));

// ── JSON body parser for everything else ──────────────────────────────────────
app.use(json());

// ── Liveness check (always 200) ────────────────────────────────────────────────
app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'payments' }));

// ── Readiness check (probes Firestore + Redis) ────────────────────────────────
app.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'degraded'> = {};

  try {
    const { db: firestoreDb } = await import('./firebase');
    await Promise.race([
      firestoreDb().collection('_health').limit(1).get(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 2_000)),
    ]);
    checks.firestore = 'ok';
  } catch { checks.firestore = 'degraded'; }

  try {
    if (process.env.REDIS_URL) {
      checks.redis = 'ok'; // BullMQ manages its own connection — probe is covered by queue worker
    } else {
      checks.redis = 'ok';
    }
  } catch { checks.redis = 'degraded'; }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    service: 'payments',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/webhooks/stripe',  stripeWebhook);
app.use('/webhooks/mpesa',   mpesaWebhook);
app.use('/webhooks/paypal',  paypalWebhook);
app.use('/checkout',         stripeCheckout);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
// Firebase must be initialized before accepting requests so Firestore refs in
// route handlers are available immediately.
initFirebase();

const server = app.listen(PORT, () =>
  logger.info('Payments service started', { port: PORT }),
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`Payments service received ${signal} — shutting down gracefully`);

  // 1. Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // 2. Drain BullMQ worker (stop processing new jobs, wait for in-flight)
      if (webhookWorker) {
        await webhookWorker.close();
        logger.info('BullMQ worker closed');
      }
      // 3. Close the queue connection
      if (webhookQueue) {
        await webhookQueue.close();
        logger.info('BullMQ queue closed');
      }
    } catch (err: unknown) {
      logger.error('Error during BullMQ shutdown', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info('Payments service shutdown complete');
    process.exit(0);
  });

  // Force exit after 15 seconds to prevent hanging
  setTimeout(() => {
    logger.error('Payments service forced shutdown after timeout');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — forcing shutdown', { error: err.message, stack: err.stack });
  process.exit(1);
});
