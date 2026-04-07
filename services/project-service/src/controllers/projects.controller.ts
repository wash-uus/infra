import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { z } from 'zod';
import { cached } from '../utils/cache';
import * as projectsService from '../services/projects.service';
import { AppError } from '@infra/shared-utils';

// ── Validation schemas ────────────────────────────────────────────────────────
const CreateProjectSchema = z.object({
  title:           z.string().min(5).max(200),
  description:     z.string().min(20).max(15_000),
  category:        z.string().min(1).max(100),
  country:         z.string().min(2).max(100),
  disciplineId:    z.string().max(100).optional(),
  isRemote:        z.boolean().optional(),
  budget:          z.number().positive().max(1_000_000_000).optional(),
  currency:        z.string().length(3).optional(),
  deadline:        z.coerce.date().optional(),
  skills:          z.array(z.string().max(50)).max(20).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'expert']).optional(),
});

const UpdateProjectSchema = CreateProjectSchema.partial();

const CreateBidSchema = z.object({
  amount:       z.number().positive().max(1_000_000_000),
  coverNote:    z.string().min(20).max(5000),
  deliveryDays: z.number().int().positive().max(3650),
  currency:     z.string().length(3).optional(),
});

// ── GET /projects ─────────────────────────────────────────────────────────────
export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const { status, category, country, disciplineId, isRemote, isFeatured, cursor, pageSize } = req.query;

  const result = await cached(
    `projects:list:${JSON.stringify(req.query)}`,
    60,
    () => projectsService.listProjects({
      status:       status as never,
      category:     category as string | undefined,
      country:      country as string | undefined,
      disciplineId: disciplineId as string | undefined,
      isRemote:     isRemote !== undefined ? isRemote === 'true' : undefined,
      isFeatured:   isFeatured !== undefined ? isFeatured === 'true' : undefined,
      cursor:       cursor as string | undefined,
      pageSize:     pageSize ? parseInt(pageSize as string, 10) : 20,
    }),
  );

  res.json({ success: true, ...result });
});

// ── POST /projects ────────────────────────────────────────────────────────────
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  const project = await projectsService.createProject({ ...parsed.data, posterId: uid });
  res.status(201).json({ success: true, data: project });
});

// ── GET /projects/:id ─────────────────────────────────────────────────────────
export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = req.user?.uid;
  const project = await cached(
    `projects:get:${id}:${requesterId ?? 'anon'}`,
    60,
    () => projectsService.getProject(id, requesterId),
  );
  res.json({ success: true, data: project });
});

// ── PUT /projects/:id ─────────────────────────────────────────────────────────
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  const project = await projectsService.updateProject(req.params.id, req.user!.uid, parsed.data);
  res.json({ success: true, data: project });
});

// ── DELETE /projects/:id ──────────────────────────────────────────────────────
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const userRole = ((req.user as Record<string, unknown> | undefined)?.['role'] as string) ?? '';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  await projectsService.softDeleteProject(req.params.id, req.user!.uid, isAdmin);
  res.json({ success: true });
});

// ── GET /projects/:id/bids ────────────────────────────────────────────────────
export const listBids = asyncHandler(async (req: Request, res: Response) => {
  const bids = await projectsService.listBidsForProject(req.params.id, req.user!.uid);
  res.json({ success: true, data: bids });
});

// ── POST /projects/:id/bids ───────────────────────────────────────────────────
export const createBid = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateBidSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
  }
  const bid = await projectsService.createBid({
    projectId: req.params.id,
    bidderId:  req.user!.uid,
    ...parsed.data,
  });
  res.status(201).json({ success: true, data: bid });
});

// ── DELETE /projects/:id/bids/:bidId ─────────────────────────────────────────
export const withdrawBid = asyncHandler(async (req: Request, res: Response) => {
  await projectsService.withdrawBid(req.params.bidId, req.user!.uid);
  res.json({ success: true });
});

// ── POST /projects/:id/bids/:bidId/accept ─────────────────────────────────────
export const acceptBid = asyncHandler(async (req: Request, res: Response) => {
  const contract = await projectsService.acceptBidAndCreateContract({
    bidId:     req.params.bidId,
    projectId: req.params.id,
    clientId:  req.user!.uid,
  });
  res.status(201).json({ success: true, data: contract });
});

// ── GET /contracts/:id ────────────────────────────────────────────────────────
export const getContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await projectsService.getContract(req.params.id, req.user!.uid);
  res.json({ success: true, data: contract });
});

// ── POST /contracts/:id/complete ──────────────────────────────────────────────
export const completeContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await projectsService.markContractComplete(req.params.id, req.user!.uid);
  res.json({ success: true, data: contract });
});
