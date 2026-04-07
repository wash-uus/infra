import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getFraudScore,
  batchRecomputeFraudScores,
  getFraudDashboard,
  submitBadgeVerification,
  getMyBadges,
  listPendingBadges,
  approveBadge,
  denyBadge,
} from '../controllers/trust.controller';

const router = Router();

router.use(requireAuth);

// ── Verified Badges (any authenticated user) ──────────────────────────────────
router.post('/badges/submit',  submitBadgeVerification);
router.get('/badges/mine',     getMyBadges);

// ── Admin — Fraud scoring ───────────────────────────────────────────────────
router.get('/fraud/dashboard',        requireAdmin, getFraudDashboard);
router.get('/fraud/score/:userId',    requireAdmin, getFraudScore);
router.post('/fraud/batch-recompute', requireAdmin, batchRecomputeFraudScores);

// ── Admin — Badge review ──────────────────────────────────────────────────────
router.get('/badges/pending',           requireAdmin, listPendingBadges);
router.post('/badges/:badgeId/approve', requireAdmin, approveBadge);
router.post('/badges/:badgeId/deny',    requireAdmin, denyBadge);

export default router;
