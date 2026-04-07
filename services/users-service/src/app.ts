import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import { env } from './config/env';
import { requestId, errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimit';
import { logger } from './config/logger';
import usersRouter from './routes/users';
import prisma from './config/database';
import { getRedisClientSync } from './config/redis';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(hpp());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o: string) => o.trim());
const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  exposedHeaders: ['X-Request-Id'],
};
app.use(cors(corsOptions));

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Request ID correlation ────────────────────────────────────────────────────
app.use(requestId);
// ── W3C Trace Context propagation ─────────────────────────────────────────────
app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  const tp = req.headers['traceparent'];
  if (tp && typeof tp === 'string') {
    // Make traceparent available to downstream service calls via res.locals
    res.locals['traceparent'] = tp;
  }
  next();
});
// ── Slow request logging (>2 s) ───────────────────────────────────────────────
app.use((_req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 2000) {
      logger.warn('Slow request', { method: _req.method, url: _req.originalUrl, durationMs: ms });
    }
  });
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'users-service',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Readiness probe (Cloud Run) ───────────────────────────────────────────────
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = getRedisClientSync();
    res.json({ status: 'ready', db: 'ok', redis: redis ? 'ok' : 'degraded' });
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/users', apiRateLimiter, usersRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
