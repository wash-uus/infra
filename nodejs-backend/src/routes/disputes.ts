import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  raiseDispute,
  getDispute,
  getMyDisputes,
  listDisputesAdmin,
  escalateDispute,
  resolveDispute,
} from '../controllers/disputes.controller';

const router = Router();

router.use(requireAuth);

// Any authenticated user
router.post('/transactions/:transactionId/raise', raiseDispute);
router.get('/mine', getMyDisputes);
router.get('/:disputeId', getDispute);

// Admin only
router.get('/',                       requireAdmin, listDisputesAdmin);
router.patch('/:disputeId/escalate',  requireAdmin, escalateDispute);
router.post('/:disputeId/resolve',    requireAdmin, resolveDispute);

export default router;
