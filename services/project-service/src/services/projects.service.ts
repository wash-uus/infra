import { Prisma, PrismaClient, ProjectStatus, BidStatus, ContractStatus, PaymentStatus } from '@prisma/client';
type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
import prisma from '../config/database';
import { AppError } from '@infra/shared-utils';
import { invalidate, invalidatePattern } from '../utils/cache';
import { publish } from '../events/publisher';
import { Topics } from '../events/topics';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProjectDto {
  posterId: string;
  title: string;
  description: string;
  category: string;
  disciplineId?: string;
  country: string;
  city?: string;
  isRemote?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  deadline?: Date;
}

export interface UpdateProjectDto extends Partial<Omit<CreateProjectDto, 'posterId'>> {
  status?: ProjectStatus;
}

export interface ListProjectsQuery {
  status?: ProjectStatus;
  category?: string;
  country?: string;
  disciplineId?: string;
  isRemote?: boolean;
  isFeatured?: boolean;
  cursor?: string;
  pageSize?: number;
}

export interface CreateBidDto {
  projectId: string;
  bidderId: string;
  amount: number;
  currency?: string;
  coverNote: string;
  deliveryDays: number;
}

export interface AcceptBidDto {
  bidId: string;
  projectId: string;
  clientId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function listProjects(query: ListProjectsQuery) {
  const { status = ProjectStatus.POSTED, category, country, disciplineId, isRemote, isFeatured, cursor, pageSize = 20 } = query;
  const limit = Math.min(pageSize, 50);

  const where: Prisma.ProjectWhereInput = {
    status,
    deletedAt: null,
    ...(category && { category }),
    ...(country && { country }),
    ...(disciplineId && { disciplineId }),
    ...(isRemote !== undefined && { isRemote }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(isFeatured && { featuredUntil: { gt: new Date() } }),
  };

  const projects = await prisma.project.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    include: {
      poster: {
        select: {
          id: true, displayName: true,
          profile: { select: { photoUrl: true, country: true, averageRating: true } },
        },
      },
      _count: { select: { bids: true } },
    },
  });

  const hasMore = projects.length > limit;
  const data = projects.slice(0, limit);
  return { data, hasMore, nextCursor: hasMore ? data[data.length - 1]?.id : undefined };
}

export async function getProject(id: string, requesterId?: string) {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      poster: {
        select: {
          id: true, displayName: true,
          profile: { select: { photoUrl: true, country: true, averageRating: true, reviewCount: true } },
        },
      },
      _count: { select: { bids: true, attachments: true } },
    },
  });

  if (!project) throw new AppError('Project not found', 404);
  prisma.project.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  let isSaved = false;
  if (requesterId) {
    const saved = await prisma.savedProject.findUnique({ where: { userId_projectId: { userId: requesterId, projectId: id } } });
    isSaved = !!saved;
  }

  return { ...project, isSaved };
}

export async function createProject(dto: CreateProjectDto) {
  const project = await prisma.project.create({
    data: {
      ...dto,
      currency: dto.currency ?? 'USD',
      budgetMin: dto.budgetMin !== undefined ? new Prisma.Decimal(dto.budgetMin) : undefined,
      budgetMax: dto.budgetMax !== undefined ? new Prisma.Decimal(dto.budgetMax) : undefined,
    },
  });

  await invalidatePattern('projects:list:*');

  publish(Topics.PROJECT_CREATED, {
    projectId: project.id,
    clientId:  project.posterId,
    title:     project.title,
    budget:    Number(project.budgetMax ?? project.budgetMin ?? 0),
    currency:  project.currency,
    category:  project.category,
    createdAt: project.createdAt.toISOString(),
  }).catch(() => {});

  return project;
}

export async function updateProject(id: string, posterId: string, dto: UpdateProjectDto) {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { posterId: true } });
  if (!existing) throw new AppError('Project not found', 404);
  if (existing.posterId !== posterId) throw new AppError('Forbidden', 403);

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...dto,
      budgetMin: dto.budgetMin !== undefined ? new Prisma.Decimal(dto.budgetMin) : undefined,
      budgetMax: dto.budgetMax !== undefined ? new Prisma.Decimal(dto.budgetMax) : undefined,
    },
  });

  await Promise.all([invalidate(`projects:get:${id}`), invalidatePattern('projects:list:*')]);

  publish(Topics.PROJECT_UPDATED, { projectId: id, clientId: posterId, updatedAt: new Date().toISOString() }).catch(() => {});

  return project;
}

export async function softDeleteProject(id: string, requesterId: string, isAdmin: boolean) {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { posterId: true } });
  if (!existing) throw new AppError('Project not found', 404);
  if (!isAdmin && existing.posterId !== requesterId) throw new AppError('Forbidden', 403);

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date(), status: ProjectStatus.CANCELLED } });
  await Promise.all([invalidate(`projects:get:${id}`), invalidatePattern('projects:list:*')]);

  publish(Topics.PROJECT_DELETED, { projectId: id, requesterId, deletedAt: new Date().toISOString() }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// BID FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function listBidsForProject(projectId: string, requesterId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { posterId: true } });
  if (!project) throw new AppError('Project not found', 404);
  if (project.posterId !== requesterId) throw new AppError('Forbidden', 403);

  return prisma.bid.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: {
      bidder: {
        select: {
          id: true, displayName: true,
          profile: { select: { photoUrl: true, averageRating: true, reviewCount: true, completedJobCount: true, country: true } },
        },
      },
    },
  });
}

export async function createBid(dto: CreateBidDto) {
  const project = await prisma.project.findFirst({ where: { id: dto.projectId, deletedAt: null }, select: { posterId: true, status: true } });
  if (!project) throw new AppError('Project not found', 404);
  if (project.status !== ProjectStatus.POSTED) throw new AppError('Project is not accepting bids', 422);
  if (project.posterId === dto.bidderId) throw new AppError('You cannot bid on your own project', 422);

  const existing = await prisma.bid.findUnique({ where: { projectId_bidderId: { projectId: dto.projectId, bidderId: dto.bidderId } } });
  if (existing && existing.status !== BidStatus.PENDING) {
    throw new AppError(`Cannot update a bid with status '${existing.status}'`, 422);
  }

  // Wrap create+counter in a transaction to prevent race conditions / double-increment
  const bid = await prisma.$transaction(async (tx) => {
    const current = await tx.bid.findUnique({ where: { projectId_bidderId: { projectId: dto.projectId, bidderId: dto.bidderId } } });
    if (current && current.status !== BidStatus.PENDING) {
      throw new AppError(`Cannot update a bid with status '${current.status}'`, 422);
    }

    const result = current
      ? await tx.bid.update({
          where: { id: current.id },
          data: { amount: new Prisma.Decimal(dto.amount), coverNote: dto.coverNote, deliveryDays: dto.deliveryDays },
        })
      : await tx.bid.create({
          data: {
            projectId: dto.projectId, bidderId: dto.bidderId,
            amount: new Prisma.Decimal(dto.amount), currency: dto.currency ?? 'USD',
            coverNote: dto.coverNote, deliveryDays: dto.deliveryDays,
          },
        });

    if (!current) {
      await tx.project.update({ where: { id: dto.projectId }, data: { bidsCount: { increment: 1 } } });
    }

    return result;
  });

  await Promise.all([invalidate(`projects:get:${dto.projectId}`), invalidatePattern('projects:list:*')]);

  publish(Topics.BID_PLACED, {
    bidId:     bid.id,
    projectId: dto.projectId,
    bidderId:  dto.bidderId,
    amount:    Number(bid.amount),
    createdAt: bid.createdAt.toISOString(),
  }).catch(() => {});

  return bid;
}

export async function withdrawBid(bidId: string, bidderId: string) {
  const bid = await prisma.bid.findUnique({ where: { id: bidId } });
  if (!bid) throw new AppError('Bid not found', 404);
  if (bid.bidderId !== bidderId) throw new AppError('Forbidden', 403);
  if (bid.status !== BidStatus.PENDING) throw new AppError(`Cannot withdraw a bid with status '${bid.status}'`, 422);

  return prisma.bid.update({ where: { id: bidId }, data: { status: BidStatus.WITHDRAWN } });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptBidAndCreateContract(dto: AcceptBidDto) {
  const { bidId, projectId, clientId } = dto;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { posterId: true, status: true, contract: { select: { id: true } } },
  });
  if (!project) throw new AppError('Project not found', 404);
  if (project.posterId !== clientId) throw new AppError('Forbidden', 403);
  if (project.status !== ProjectStatus.POSTED) throw new AppError('Project is not in a biddable state', 422);
  if (project.contract) throw new AppError('A contract already exists for this project', 409);

  const bid = await prisma.bid.findUnique({ where: { id: bidId }, select: { id: true, bidderId: true, amount: true, currency: true, status: true } });
  if (!bid) throw new AppError('Bid not found', 404);
  if (bid.status !== BidStatus.PENDING) throw new AppError(`Bid is no longer available (status: ${bid.status})`, 422);

  const contract = await prisma.$transaction(async (tx: TxClient) => {
    await tx.bid.updateMany({ where: { projectId, id: { not: bidId }, status: BidStatus.PENDING }, data: { status: BidStatus.REJECTED } });
    await tx.bid.update({ where: { id: bidId }, data: { status: BidStatus.ACCEPTED } });
    await tx.project.update({ where: { id: projectId }, data: { status: ProjectStatus.IN_PROGRESS } });
    return tx.contract.create({
      data: {
        projectId, bidId, clientId,
        professionalId: bid.bidderId,
        agreedAmount: bid.amount,
        currency: bid.currency,
        startedAt: new Date(),
      },
    });
  });

  await Promise.all([invalidate(`projects:get:${projectId}`), invalidatePattern('projects:list:*')]);

  publish(Topics.CONTRACT_SIGNED, {
    contractId:     contract.id,
    projectId,
    clientId,
    professionalId: bid.bidderId,
    amount:         Number(bid.amount),
    currency:       bid.currency,
    signedAt:       (contract.startedAt ?? new Date()).toISOString(),
  }).catch(() => {});

  return contract;
}

export async function getContract(contractId: string, requesterId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      project:      { select: { id: true, title: true, category: true } },
      bid:          { select: { deliveryDays: true, coverNote: true } },
      client:       { select: { id: true, displayName: true, profile: { select: { photoUrl: true } } } },
      professional: { select: { id: true, displayName: true, profile: { select: { photoUrl: true, averageRating: true } } } },
      attachments:  true,
    },
  });

  if (!contract) throw new AppError('Contract not found', 404);
  if (contract.clientId !== requesterId && contract.professionalId !== requesterId) {
    throw new AppError('Forbidden', 403);
  }
  return contract;
}

export async function markContractComplete(contractId: string, clientId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { clientId: true, status: true, projectId: true } });
  if (!contract) throw new AppError('Contract not found', 404);
  if (contract.clientId !== clientId) throw new AppError('Forbidden', 403);
  if (contract.status !== ContractStatus.ACTIVE) throw new AppError(`Contract is already ${contract.status}`, 422);

  const updated = await prisma.$transaction(async (tx: TxClient) => {
    await tx.project.update({ where: { id: contract.projectId }, data: { status: ProjectStatus.COMPLETED } });
    return tx.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.COMPLETED, completedAt: new Date(), paymentStatus: PaymentStatus.RELEASED, releasedAt: new Date() },
    });
  });

  await invalidate(`projects:get:${contract.projectId}`);

  publish(Topics.CONTRACT_COMPLETED, {
    contractId,
    projectId:      contract.projectId,
    clientId,
    professionalId: updated.professionalId,
    completedAt:    updated.completedAt!.toISOString(),
  }).catch(() => {});

  return updated;
}
