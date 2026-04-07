/**
 * Admin Routes — all endpoints require Firebase auth + admin role.
 * Mount at: /api/admin
 */

import { Router } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin, requireModerator } from '../middleware/auth';
import { adminRateLimiter, adminCriticalLimiter } from '../middleware/rateLimit';
import { requireConfirmationHeader } from '../utils/auditLog';
import {
  getStats,
  getUsers,
  getUserById,
  banUser,
  unbanUser,
  verifyUser,
  setUserRole,
  deleteUser,
  getJobs,
  setJobStatus,
  featureJob,
  removeJob,
  getTools,
  featureTool,
  removeTool,
  setToolStatus,
  getTransactions,
  refundTransaction,
  sendBroadcastNotification,
  getAuditLogs,
  getSystemMetrics,
  getServiceHealth,
  getMessageVolume,
  getAbuseReports,
  resolveAbuseReport,
  getAdminSubscriptions,
  getRevenueAnalytics,
  getModerationQueue,
  moderateContent,
  getJobMatches,
  adminEventStream,
  getAdminActivity,
  getPricing,
  setPricing,
  validateSystem,
  getFlags,
  setFlags,
  getLiveRevenue,
  getActiveUsers,
  launchSystem,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role + admin rate limit
router.use(requireAuth, requireAdmin, adminRateLimiter);

// ── Stats & Metrics ───────────────────────────────────────────────────────────
router.get('/stats',              getStats);
router.get('/metrics',            getSystemMetrics);
router.get('/health',             getServiceHealth);
router.get('/analytics/messages', getMessageVolume);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users',              getUsers);
router.get('/users/:id',          getUserById);
router.post('/users/:id/ban',     banUser);
router.post('/users/:id/unban',   unbanUser);
router.post('/users/:id/verify',  verifyUser);
// Role change is superadmin-only (cannot be done by regular admins)
router.post('/users/:id/role',    requireSuperAdmin, adminCriticalLimiter, setUserRole);
// Delete is superadmin-only — requires confirmation header
router.delete('/users/:id',       requireSuperAdmin, adminCriticalLimiter, requireConfirmationHeader, deleteUser);

// ── Jobs ──────────────────────────────────────────────────────────────────────
router.get('/jobs',                  getJobs);
router.patch('/jobs/:id/status',     setJobStatus);
router.patch('/jobs/:id/feature',    featureJob);
router.delete('/jobs/:id',           removeJob);
router.get('/jobs/:id/matches',      getJobMatches);

// ── Tools ─────────────────────────────────────────────────────────────────────
router.get('/tools',               getTools);
router.patch('/tools/:id/feature', featureTool);
router.patch('/tools/:id/status',  setToolStatus);
router.delete('/tools/:id',        removeTool);

// ── Transactions ──────────────────────────────────────────────────────────────
router.get('/transactions',                  getTransactions);
// Refund is superadmin-only — requires confirmation header + tighter rate limit
router.post('/transactions/:id/refund',      requireSuperAdmin, adminCriticalLimiter, requireConfirmationHeader, refundTransaction);

// ── Abuse Reports ─────────────────────────────────────────────────────────────
router.get('/abuse-reports',                requireModerator, getAbuseReports);
router.post('/abuse-reports/:id/resolve',   requireModerator, resolveAbuseReport);

// ── Subscriptions & Revenue Analytics ────────────────────────────────────────
router.get('/subscriptions',              getAdminSubscriptions);
router.get('/analytics/revenue',          getRevenueAnalytics);

// ── Moderation ────────────────────────────────────────────────────────────────
router.get('/moderation',         requireModerator, getModerationQueue);
router.post('/moderation/:id',    requireModerator, moderateContent);

// ── Notifications ─────────────────────────────────────────────────────────────
router.post('/notifications/broadcast', sendBroadcastNotification);

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogs);

// ── Admin Activity Timeline ───────────────────────────────────────────────────
router.get('/activity', getAdminActivity);

// ── Dynamic Pricing ───────────────────────────────────────────────────────────
router.get('/pricing',         requireSuperAdmin, getPricing);
router.put('/pricing',         requireSuperAdmin, adminCriticalLimiter, setPricing);

// ── System Validation ─────────────────────────────────────────────────────────
router.get('/system/validate', requireSuperAdmin, validateSystem);

// ── Feature Flags ─────────────────────────────────────────────────────────────
router.get('/features',  requireSuperAdmin, getFlags);
router.put('/features',  requireSuperAdmin, adminCriticalLimiter, setFlags);

// ── Live Revenue + Active Users ───────────────────────────────────────────────
router.get('/analytics/live-revenue',  getLiveRevenue);
router.get('/analytics/active-users',  getActiveUsers);

// ── System Launch ─────────────────────────────────────────────────────────────
// One-time atomic seed of all Firestore config docs.  Idempotent.
router.post('/launch', requireSuperAdmin, adminCriticalLimiter, launchSystem);

// ── SSE Admin Event Stream ────────────────────────────────────────────────────
// No asyncHandler — manages own response lifecycle
router.get('/events', adminEventStream);

export default router;
