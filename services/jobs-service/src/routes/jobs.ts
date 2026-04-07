import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  listJobs,
  getJob,
  createJob,
  updateJob,
  closeJob,
  applyToJob,
  getJobApplications,
  getMyApplications,
} from '../controllers/jobs.controller';

const router = Router();

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.get('/',    listJobs);
router.get('/:id', getJob);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate);

router.post('/',            createJob);
router.put('/:id',          updateJob);
router.patch('/:id/close',  closeJob);

// Applications
router.post('/:id/apply',        applyToJob);
router.get('/:id/applications',  getJobApplications);
router.get('/applications/mine', getMyApplications);

export default router;
