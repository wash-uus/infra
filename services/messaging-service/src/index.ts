import 'dotenv/config';
// Fail-fast env validation — must run before Firebase / Redis init
import './config/env';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initFirebase, verifyToken, getDb } from './firebase';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { FieldValue } from 'firebase-admin/firestore';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// ── Sentry ────────────────────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (async () => {
    try {
      // Dynamic require so the package is optional — add @sentry/node to
      // package.json to enable in production.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node') as { init: (opts: Record<string, unknown>) => void }; // eslint-disable-line
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment:      process.env.NODE_ENV ?? 'production',
        tracesSampleRate: 0.05,
      });
      logger.info('Sentry initialised for messaging service');
    } catch {
      // @sentry/node not installed — skip silently
    }
  })();
}

// Initialize Firebase Admin (throws if credentials are not set)
initFirebase();
const db = getDb();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'messaging' }));

app.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'degraded'> = {};

  // Firestore probe
  try {
    const db = getDb();
    await Promise.race([
      db.collection('_health').limit(1).get(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 2_000)),
    ]);
    checks.firestore = 'ok';
  } catch { checks.firestore = 'degraded'; }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    service: 'messaging',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

async function startServer() {
  // ── Redis adapter setup ───────────────────────────────────────────────────
  // A single pubClient is used for both the Socket.io adapter AND per-user
  // rate-limit counters. When Redis is unavailable the service falls back to
  // single-instance mode: events work locally but won't cross Cloud Run pods.
  let redisClient: ReturnType<typeof createClient> | null = null;

  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err: Error) =>
        logger.error('Redis pub error', { error: err.message }));
      subClient.on('error', (err: Error) =>
        logger.error('Redis sub error', { error: err.message }));

      await Promise.race([
        (async () => { await pubClient.connect(); await subClient.connect(); })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis connect timeout')), 5_000)),
      ]);

      io.adapter(createAdapter(pubClient, subClient));
      redisClient = pubClient;
      logger.info('Socket.io Redis adapter attached — horizontal scaling enabled');
    } catch (err: unknown) {
      logger.warn(
        'Redis unavailable — running in single-instance mode (cross-pod broadcast disabled)',
        { error: err instanceof Error ? err.message : String(err) },
      );
      // Do NOT exit — serve traffic with local-only socket.io
    }
  } else {
    logger.info('REDIS_URL not set — Socket.io running in single-instance mode');
  }

  // ── Authentication middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = await verifyToken(token); // checkRevoked=true
      socket.data.userId = decoded.uid;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  const onlineKey    = (uid: string) => `user:${uid}:online`;
  const rateLimitKey = (uid: string) => `user:${uid}:msglimit`;

  // ── Typing event throttle map (in-process, per socket) ───────────────────
  // Prevents typing_start spam: max 1 broadcast per 500 ms per conversation.
  const typingThrottle = new Map<string, NodeJS.Timeout>();

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);

    // Track presence in Redis (best-effort — no throw if Redis is down)
    if (redisClient) {
      redisClient.set(onlineKey(userId), '1', { EX: 300 }).catch(() => {});
    }
    io.to(`user:${userId}`).emit('presence_update', { userId, online: true });

    // ── join_conversation — participant membership check ────────────────
    socket.on('join_conversation', async (conversationId: string) => {
      if (typeof conversationId !== 'string' || !conversationId) {
        socket.emit('error', 'Invalid conversation ID');
        return;
      }
      try {
        const convSnap = await db.collection('conversations').doc(conversationId).get();
        if (!convSnap.exists || !(convSnap.data()?.participants ?? []).includes(userId)) {
          socket.emit('error', 'Unauthorized to join conversation');
          return;
        }
        socket.join(`conv:${conversationId}`);
      } catch {
        socket.emit('error', 'Failed to join conversation');
      }
    });

    // ── send_message — rate-limited, IDOR-checked, atomically idempotent ─
    socket.on('send_message', async (data: {
      conversationId: string;
      message: string;
      messageId: string;
    }) => {
      const { conversationId, message, messageId } = data;

      if (!conversationId || !message || !messageId) {
        socket.emit('error', 'Invalid message payload');
        return;
      }
      if (message.length > 4_000) {
        socket.emit('error', 'Message too long (max 4000 chars)');
        return;
      }

      // Redis-backed sliding-window rate limit: max 20 messages per 10 seconds.
      // Uses a sorted set where each member is a unique entry and the score is the
      // Unix timestamp (ms). Falls back to pass-through if Redis is unavailable.
      if (redisClient) {
        try {
          const rateKey = rateLimitKey(userId);
          const now     = Date.now();
          const window  = 10_000; // 10 seconds in ms
          const limit   = 20;     // max messages per window

          await redisClient
            .multi()
            .zRemRangeByScore(rateKey, '-inf', now - window)  // remove old entries
            .zAdd(rateKey, { score: now, value: `${now}-${Math.random()}` }) // add current
            .expire(rateKey, 15)  // auto-expire key after 15 s (> window size)
            .exec();

          const count = await redisClient.zCard(rateKey);
          if (count > limit) {
            socket.emit('error', 'Rate limit exceeded — max 20 messages per 10 seconds');
            return;
          }
        } catch {
          // Redis error during rate check — allow the message through
        }
      }

      // IDOR — verify the sender is a participant
      const convRef  = db.collection('conversations').doc(conversationId);
      const convSnap = await convRef.get();
      if (!convSnap.exists || !(convSnap.data()?.participants ?? []).includes(userId)) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      // Atomic idempotency: create() throws gRPC ALREADY_EXISTS (code 6) if the
      // message doc already exists — prevents double-delivery race conditions.
      const messageRef = convRef.collection('messages').doc(messageId);
      try {
        await messageRef.create({
          senderId:  userId,
          message,
          timestamp: FieldValue.serverTimestamp(),
          readBy:    [userId],
        });
      } catch (err: unknown) {
        if ((err as { code?: number }).code === 6) {
          socket.emit('error', 'Duplicate message');
          return;
        }
        throw err;
      }

      await convRef.update({
        lastMessage:   message,
        lastMessageAt: FieldValue.serverTimestamp(),
        updatedAt:     FieldValue.serverTimestamp(),
      });

      io.to(`conv:${conversationId}`).emit('new_message', {
        messageId,
        conversationId,
        senderId: userId,
        message,
      });
    });

    // ── typing events — throttled to 1 broadcast per 500 ms per conversation
    socket.on('typing_start', (conversationId: string) => {
      if (!socket.rooms.has(`conv:${conversationId}`)) return;
      const key = `${socket.id}:${conversationId}`;
      if (typingThrottle.has(key)) return; // already broadcasting — drop
      socket.to(`conv:${conversationId}`).emit('typing_start', { userId });
      typingThrottle.set(key, setTimeout(() => typingThrottle.delete(key), 500));
    });

    socket.on('typing_stop', (conversationId: string) => {
      if (!socket.rooms.has(`conv:${conversationId}`)) return;
      const key = `${socket.id}:${conversationId}`;
      const t = typingThrottle.get(key);
      if (t) { clearTimeout(t); typingThrottle.delete(key); }
      socket.to(`conv:${conversationId}`).emit('typing_stop', { userId });
    });

    socket.on('disconnect', () => {
      if (redisClient) {
        redisClient.del(onlineKey(userId)).catch(() => {});
      }
      io.to(`user:${userId}`).emit('presence_update', { userId, online: false });
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    logger.info(`Messaging service running on port ${PORT}`);
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  // Cloud Run sends SIGTERM before killing the container. We stop accepting
  // new socket connections, wait up to 10 s for in-flight messages to flush,
  // then close Redis and exit cleanly. Without this, in-flight messages are
  // dropped and ephemeral socket state is lost on every deploy.

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received — starting graceful shutdown`);

    // Stop accepting new socket connections
    io.close(() => logger.info('Socket.io server closed'));

    // Give in-flight socket event handlers up to 10 s to complete
    const shutdownTimer = setTimeout(() => {
      logger.warn('Shutdown timeout reached — forcing exit');
      process.exit(1);
    }, 10_000).unref();

    try {
      // Close HTTP server (stops new HTTP requests)
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      logger.info('HTTP server closed');

      // Disconnect Redis if connected
      if (redisClient) {
        await redisClient.quit().catch(() => redisClient!.disconnect());
        logger.info('Redis disconnected');
      }

      clearTimeout(shutdownTimer);
      logger.info('Messaging service shut down cleanly');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: (err as Error).message });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });
}

startServer().catch((err) => {
  logger.error('Failed to start messaging service', { error: (err as Error).message });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — forcing shutdown', { error: err.message, stack: err.stack });
  process.exit(1);
});
