// ── Observability (must be first) ─────────────────────────────────────────────
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn:                process.env.SENTRY_DSN,
    environment:        process.env.NODE_ENV ?? 'development',
    tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

import { env } from './config/env';
import { initRedis, closeRedis } from './config/redis';
import { logger } from './config/logger';
import { closePubSub, ensureTopics } from './events/publisher';
import app from './app';

async function bootstrap(): Promise<void> {
  try { await initRedis(); } catch (err) {
    logger.warn('Redis unavailable at startup — service running in degraded mode', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  try { await ensureTopics(); } catch (err) {
    logger.warn('Pub/Sub topic init failed — event publishing disabled', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const server = app.listen(env.PORT, () => {
    logger.info('jobs-service started', { port: env.PORT, env: env.NODE_ENV });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await Promise.allSettled([closeRedis(), closePubSub()]);
      logger.info('jobs-service shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception — forcing shutdown', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed — exiting', { error: String(err) });
  process.exit(1);
});
