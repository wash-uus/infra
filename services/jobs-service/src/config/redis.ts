import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    redisClient.on('connect',  () => logger.info('Redis connected'));
    redisClient.on('error',    (err) => logger.error('Redis error', { error: err.message }));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  }
  return redisClient;
}

export async function initRedis(): Promise<void> {
  const client = getRedis();
  await client.ping();
  logger.info('Redis ping OK');
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// ── Simple cache helpers ──────────────────────────────────────────────────────

export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await getRedis().get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* fallthrough on Redis error */ }

  const value = await fn();
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch { /* ignore cache write errors */ }
  return value;
}

export async function invalidate(key: string): Promise<void> {
  try { await getRedis().del(key); } catch { /* noop */ }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length) await getRedis().del(...keys);
  } catch { /* noop */ }
}
