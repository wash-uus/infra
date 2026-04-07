import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as GrowthController from '../controllers/growth.controller';

const router = Router();

router.use(requireAuth);

// Referral system
router.get('/referrals/code',              GrowthController.getMyReferralCode);
router.get('/referrals/stats',             GrowthController.getReferralStats);
router.get('/referrals/leaderboard',       GrowthController.getReferralLeaderboard);
router.post('/referrals/apply',            GrowthController.applyReferralCode);
router.post('/referrals/confirm/:refereeId', GrowthController.confirmReferral);

// Profile completeness score
router.get('/profile/completeness',       GrowthController.getProfileCompleteness);

export default router;
