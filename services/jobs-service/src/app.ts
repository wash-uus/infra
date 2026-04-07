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
import { logger } from './config/logger';
import jobsRouter from './routes/jobs';
import { col } from './config/firebase';

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

// ── Slow request logging ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 2000) {
      logger.warn('Slow request', { method: req.method, path: req.path, ms });
    }
  });
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: env.SERVICE_NAME,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Readiness probe (Cloud Run) ──────────────────────────────────────────
app.get('/ready', async (_req, res) => {
  try {
    await Promise.race([
      col.jobs.limit(1).get(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 2_000)),
    ]);
    res.json({ status: 'ready', firestore: 'ok' });
  } catch (err) {
    res.status(503).json({
      status: 'not ready',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/jobs', jobsRouter);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler as express.ErrorRequestHandler);

export default app;
