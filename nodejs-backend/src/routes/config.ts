/**
 * Config Routes — public endpoints for client-readable configuration.
 * No authentication required — data is non-sensitive.
 * Mount at: /api/config
 */

import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { Response } from 'express';
import { AuthRequest } from '../types';
import { getFeatureFlags } from '../services/featureFlags.service';
import { getPricingConfig } from '../services/pricing.service';
import { cached } from '../utils/cache';

const router = Router();

// GET /api/config/features — current feature flags (30s cache)
router.get('/features', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const flags = await getFeatureFlags();
  // Cache-control for the CDN / browser — keep short so flag changes propagate
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json({ success: true, data: flags });
}));

// GET /api/config/pricing — public pricing (60s cache)
router.get('/pricing', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const pricing = await getPricingConfig();
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.json({ success: true, data: pricing });
}));

export default router;
