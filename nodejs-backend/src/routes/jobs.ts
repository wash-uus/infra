import { Router } from 'express';
import multer from 'multer';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { uploadRateLimiter } from '../middleware/rateLimit';
import * as JobsController from '../controllers/jobs.controller';
import { validate, createJobSchema, updateJobSchema, applyToJobSchema } from '../utils/validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get('/', optionalAuth, JobsController.listJobs);
router.get('/:id', optionalAuth, JobsController.getJob);

// Authenticated
router.use(requireAuth);
router.post('/', validate(createJobSchema), JobsController.createJob);
router.put('/:id', validate(updateJobSchema), JobsController.updateJob);
router.delete('/:id', JobsController.deleteJob);
router.post('/:id/bookmark', JobsController.toggleBookmark);
router.post('/:id/feature', JobsController.featureJob);
router.post('/:id/apply', validate(applyToJobSchema), JobsController.applyToJob);
router.get('/:id/applications', JobsController.getJobApplications);
router.post('/:id/applications/:appId/unlock', JobsController.unlockApplicant);
router.get('/applications/mine', JobsController.getMyApplications);
router.put('/applications/:appId/status', JobsController.updateApplicationStatus);
router.post('/applications/:appId/boost', JobsController.boostApplication);
router.get('/quota/applications', JobsController.getApplicationQuota);
router.post('/:id/images', uploadRateLimiter, upload.single('image'), JobsController.uploadJobImage);

export default router;
