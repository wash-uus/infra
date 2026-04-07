import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { logger } from '../utils/logger';
import { getRedisClientSync } from '../config/redis';

/**
 * Rate-limit key generator: prefers authenticated UID over IP address.
 *
 * We extract the JWT sub claim from the raw Authorization header WITHOUT
 * verifying the signature â€” this is fine for rate limiting (not auth),
 * because even if someone spoofs a uid in a forged token, the verify step
 * in requireAuth will reject them before business logic runs. The goal here
 * is just to bucket requests so legitimate users don't share an IP bucket
 * behind a shared NAT/corporate proxy.
 *
 * Falls back to req.ip when the header is absent or malformed.
 */
function extractUidFromAuthHeader(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = authHeader.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.sub === 'string' && decoded.sub ? decoded.sub : null;
  } catch {
    return null;
  }
}

function keyGenerator(req: Request): string {
  const uid = extractUidFromAuthHeader(req.headers.authorization as string | undefined);
  return uid ? `uid:${uid}` : (req.ip ?? 'unknown');
}

// â”€â”€ Redis store â€” lazy, uses shared singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// `getRedisClientSync()` returns null until initRedis() resolves at startup,
// so the first few requests before Redis is ready fall back to in-memory â€”
// which is acceptable. Once Redis is ready all instances share counters.
function buildRedisStore() {
  try {
    const client = getRedisClientSync();
    if (!client) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RateLimitRedisStore = require('rate-limit-redis');
    return new RateLimitRedisStore({
      sendCommand: (...args: string[]) => (client as any).call(...args),
      prefix: 'infra:rl:',
    });
  } catch (err) {
    logger.warn('Could not build Redis rate-limit store â€” using in-memory fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

// Re-evaluate the store on each limiter call so it picks up the client once
// Redis has connected.  express-rate-limit accepts a function for `store`.
// We use a lazy proxy pattern: build once, cache.
let _store: ReturnType<typeof buildRedisStore> = undefined;
function getStore() {
  if (_store !== undefined) return _store;
  _store = buildRedisStore();
  return _store;
}

// â”€â”€ General API limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Applied to all /api/* routes. Keyed by uid (authenticated) or IP (anonymous).
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// â”€â”€ Auth limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tight limit on login / signup / password-reset to prevent credential stuffing.
// Always keyed by IP (pre-auth, no uid available).
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  message: { success: false, message: 'Too many auth attempts, please wait.' },
});

// â”€â”€ Upload limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Upload limit reached for this hour.' },
});

// â”€â”€ Write limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Applied to all state-changing requests (POST / PUT / PATCH / DELETE).
// Keyed by uid when authenticated so shared-NAT users don't starve each other.
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Too many write operations. Please slow down.' },
  skip: (req: Request) =>
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
});

// â”€â”€ Per-user sensitive-action limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Applied to high-value write operations (reviews, payments, job creation).
// Tighter than writeRateLimiter â€” 10 per minute per user.
export const perUserActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Action rate limit reached. Please wait a moment.' },
});

// â”€â”€ Search limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Full-text / Firestore reads are expensive; throttle aggressive crawlers.
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Search rate limit reached. Please wait a moment.' },
});

// ── Admin general limiter ─────────────────────────────────────────────────────
// 60 req/min per admin uid — covers enumeration and credential abuse.
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Admin rate limit exceeded. Please wait a moment.' },
});

// ── Admin critical-action limiter ─────────────────────────────────────────────
// 10 req/min per admin uid — applied to destructive ops: refund, delete, role change.
export const adminCriticalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
  keyGenerator,
  message: { success: false, message: 'Critical action rate limit exceeded. Wait 1 minute.' },
});
