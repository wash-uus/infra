/**
 * Audit Logging Utility
 * Writes admin actions to the `admin_logs` Firestore collection.
 * All writes are fire-and-forget (never throw) so they don't break the
 * primary operation if Firestore is degraded.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { logger } from './logger';

export type AdminAction =
  | 'user.ban'
  | 'user.unban'
  | 'user.verify'
  | 'user.role_change'
  | 'user.delete'
  | 'job.approve'
  | 'job.reject'
  | 'job.remove'
  | 'job.feature'
  | 'tool.approve'
  | 'tool.reject'
  | 'tool.remove'
  | 'tool.feature'
  | 'tool.status_change'
  | 'transaction.refund'
  | 'notification.broadcast'
  | 'report.resolve'
  | 'report.dismiss'
  | 'moderation.approve'
  | 'moderation.reject'
  | 'subscription.activate'
  | 'payment.webhook'
  | 'system.view_metrics';

export interface AuditLogEntry {
  adminId: string;
  adminEmail?: string;
  action: AdminAction;
  targetId?: string;
  targetType?: 'user' | 'job' | 'tool' | 'transaction' | 'notification' | 'system';
  metadata?: Record<string, unknown>;
  /** IP address of the admin at time of action */
  ip?: string;
  /** Browser/client identifier for device fingerprinting */
  userAgent?: string;
  timestamp: FirebaseFirestore.FieldValue;
}

/**
 * Write an admin action to the `admin_logs` collection.
 * Fire-and-forget — errors are logged but never thrown.
 *
 * Pass `req` to automatically capture IP + User-Agent for audit trail.
 */
export function logAdminAction(
  entry: Omit<AuditLogEntry, 'timestamp'>,
  req?: import('express').Request,
): void {
  const doc: AuditLogEntry = {
    ...entry,
    ip: req?.ip ?? entry.ip,
    userAgent: req ? (req.headers['user-agent'] ?? undefined) : entry.userAgent,
    timestamp: FieldValue.serverTimestamp(),
  };

  db.collection('admin_logs').add(doc).catch((err: Error) => {
    logger.error('Failed to write admin audit log', {
      action: entry.action,
      adminId: entry.adminId,
      error: err.message,
    });
  });

  logger.info('Admin action', {
    action: entry.action,
    adminId: entry.adminId,
    targetId: entry.targetId,
    ip: doc.ip,
    metadata: entry.metadata,
  });
}

/**
 * Express middleware that requires the `X-Admin-Confirm: true` header.
 * Apply to destructive superadmin operations (delete user, refund, etc.)
 * to prevent CSRF / accidental triggers.
 */
export function requireConfirmationHeader(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
): void {
  if (req.headers['x-admin-confirm'] !== 'true') {
    res.status(428).json({
      success: false,
      message: 'Dangerous action requires confirmation header: X-Admin-Confirm: true',
    });
    return;
  }
  next();
}
