import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { z } from 'zod';
import { cached } from '../utils/cache';
import * as usersService from '../services/users.service';
import { AppError } from '@infra/shared-utils';
import { logger } from '../config/logger';

// ── Validation schemas ────────────────────────────────────────────────────────
const SyncUserSchema = z.object({
  uid:         z.string().min(1).max(128),
  email:       z.string().email().max(254),
  displayName: z.string().min(1).max(200),
  role:        z.enum(['client', 'professional', 'admin']).optional(),
});

const UpdateMeSchema = z.object({
  displayName:  z.string().min(1).max(200).optional(),
  bio:          z.string().max(2000).optional(),
  photoURL:     z.string().url().max(500).optional(),
  location:     z.string().max(200).optional(),
  skills:       z.array(z.string().max(50)).max(30).optional(),
  website:      z.string().url().max(500).optional(),
  linkedinUrl:  z.string().url().max(500).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  hourlyRate:   z.number().positive().max(10_000).optional(),
  currency:     z.string().length(3).optional(),
});

// ── POST /sync ─── (called by the frontend on every sign-in) ────────────────
export const syncUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = SyncUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  const { uid, email, displayName, role } = parsed.data;

  const user = await usersService.upsertUser({
    id: uid,
    email,
    displayName,
    role: role as never,
  });

  res.status(200).json({ success: true, data: user });
});

// ── GET /me ──────────────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!.uid;

  const user = await cached(`users:me:${uid}`, 60, () => usersService.getUserById(uid));
  if (!user) throw new AppError('User not found', 404);

  res.json({ success: true, data: user });
});

// ── PUT /me ───────────────────────────────────────────────────────────────────
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const parsed = UpdateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  const profile = await usersService.updateProfile(uid, parsed.data);
  res.json({ success: true, data: profile });
});

// ── PUT /me/fcm-token ────────────────────────────────────────────────────────
export const updateFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { token } = req.body as { token: string };
  if (!token) throw new AppError('token is required', 400);
  await usersService.updateFcmToken(uid, token);
  res.json({ success: true });
});

// ── GET /profile/:id ─────────────────────────────────────────────────────────
export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const profile = await cached(`users:profile:${id}`, 120, () => usersService.getPublicProfile(id));
  res.json({ success: true, data: profile });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
export const adminListUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.adminListUsers({
    role:             req.query.role as never,
    isSuspended:      req.query.isSuspended !== undefined ? req.query.isSuspended === 'true' : undefined,
    subscriptionTier: req.query.subscriptionTier as never,
    cursor:           req.query.cursor as string | undefined,
    pageSize:         req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
  });
  res.json({ success: true, ...result });
});

// ── POST /admin/users/:id/suspend ─────────────────────────────────────────────
export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  if (!reason) throw new AppError('reason is required', 400);
  await usersService.suspendUser({ targetId: req.params.id, actorId: req.user!.uid, reason });
  logger.info('User suspended', { targetId: req.params.id, actorId: req.user!.uid });
  res.json({ success: true });
});

// ── POST /admin/users/:id/restore ────────────────────────────────────────────
export const restoreUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  if (!reason) throw new AppError('reason is required', 400);
  await usersService.restoreUser({ targetId: req.params.id, actorId: req.user!.uid, reason });
  res.json({ success: true });
});

// ── POST /admin/users/:id/verify-id ─────────────────────────────────────────
export const approveIdVerification = asyncHandler(async (req: Request, res: Response) => {
  await usersService.approveIdVerification(req.params.id, req.user!.uid);
  res.json({ success: true });
});
