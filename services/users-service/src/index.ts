// ── Observability (must be first) ────────────────────────────────────────────
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

import { env } from './config/env';
import { initRedis, closeRedis } from './config/redis';
import { logger } from './config/logger';
import prisma from './config/database';
import { closePubSub, ensureTopics } from './events/publisher';
import app from './app';

async function bootstrap(): Promise<void> {
  // Connect infrastructure
  await initRedis();
  await ensureTopics();

  const server = app.listen(env.PORT, () => {
    logger.info('users-service started', { port: env.PORT, env: env.NODE_ENV });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);

    server.close(async () => {
      try {
        await Promise.allSettled([
          prisma.$disconnect(),
          closeRedis(),
          closePubSub(),
        ]);
        logger.info('users-service shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err instanceof Error ? err.message : String(err) });
        process.exit(1);
      }
    });

    // Force exit after 15 s
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
