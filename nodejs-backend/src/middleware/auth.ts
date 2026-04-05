import { Request, Response, NextFunction } from 'express';
import { authAdmin, col } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { AppError } from '../utils/errors';
import { cached } from '../utils/cache';
import prisma from '../config/database';

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches the decoded token to req.user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const idToken = header.split('Bearer ')[1];
    if (!idToken) {
      throw new AppError('Invalid authorization token', 401);
    }

    const decoded = await authAdmin.verifyIdToken(idToken, true /* checkRevoked */);

    // Check app-level suspension (cached 60 s so bans propagate within ~1 minute)
    const isSuspended = await cached(
      `user:suspended:${decoded.uid}`,
      60,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: decoded.uid },
          select: { isSuspended: true },
        });
        return user?.isSuspended ?? false;
      },
    );
    if (isSuspended) {
      throw new AppError('Account suspended. Please contact support.', 403);
    }

    req.user = decoded;

    // Fire-and-forget lastSeen update for active user analytics.
    col.users.doc(decoded.uid).set(
      { lastSeen: FieldValue.serverTimestamp() },
      { merge: true },
    ).catch(() => {});

    next();
  } catch (err: any) {
    if (err instanceof AppError) {
      next(err);
    } else if (err.code === 'auth/id-token-revoked') {
      next(new AppError('Token has been revoked. Please sign in again.', 401));
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
}

/**
 * Optional auth — attaches user if token present, but does not fail if absent.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const idToken = header.split('Bearer ')[1];
      if (idToken) {
        const decoded = await authAdmin.verifyIdToken(idToken, true /* checkRevoked */);
        req.user = decoded;
      }
    }
    next();
  } catch {
    // Token present but invalid — treat as unauthenticated
    next();
  }
}

/**
 * Require a specific role. Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    // Firebase Admin SDK places custom claims at the top level of the decoded token object.
    const userRole: string = (user as Record<string, unknown> | undefined)?.['role'] as string ?? '';
    if (!roles.includes(userRole)) {
      next(new AppError('Insufficient permissions', 403));
    } else {
      next();
    }
  };
}

/**
 * Require admin or superadmin role. Must be used after requireAuth.
 * Usage: router.get('/admin/users', requireAuth, requireAdmin, handler)
 */
export const requireAdmin = requireRole('admin', 'superadmin');

/**
 * Require superadmin role only. Must be used after requireAuth.
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Require at least moderator role (moderator | admin | superadmin).
 * Grants access to moderation queue and abuse report endpoints.
 */
export const requireModerator = requireRole('moderator', 'admin', 'superadmin');
