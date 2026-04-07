import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as RevenueController from '../controllers/revenue.controller';

const router = Router();

router.use(requireAuth);

router.get('/prices',       RevenueController.getPrices);
router.post('/ab-conversion', RevenueController.trackConversion);
router.get('/metrics',      RevenueController.getRevenueMetrics);
router.post('/churn-scan',  RevenueController.triggerChurnScan);
router.get('/churn-risk',   RevenueController.getMyChurnRisk);

export default router;
