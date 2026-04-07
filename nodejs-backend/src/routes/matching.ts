import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getJobMatchScores,
  getMyMatchScore,
  rescoreJobApplications,
} from '../controllers/matching.controller';

const router = Router();

router.use(requireAuth);

// Any authenticated user can see their own score for a job
router.get('/jobs/:jobId/my-score', getMyMatchScore);

// Job owner or admin only
router.get('/jobs/:jobId/scores', getJobMatchScores);
router.post('/jobs/:jobId/rescore', rescoreJobApplications);

export default router;
