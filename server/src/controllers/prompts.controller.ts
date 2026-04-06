import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { enqueueToneAnalysis } from '../services/queue/queue.service';
import { NotFoundError, ConflictError } from '../middleware/error-handler';
import { parsePagination, buildPaginatedResult } from '../utils/pagination';

/**
 * GET /api/users/:id/prompts
 * List all prompt versions for a user, with optional context filter.
 */
export async function listPrompts(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { context, status } = req.query;
  const pagination = parsePagination(req.query as Record<string, any>);

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const where: any = { userId: id };
  if (context) where.context = context;
  if (status) where.status = status;

  const [prompts, total] = await Promise.all([
    prisma.tonePrompt.findMany({
      where,
      orderBy: [{ context: 'asc' }, { version: 'desc' }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.tonePrompt.count({ where }),
  ]);

  res.json(buildPaginatedResult(prompts, total, pagination));
}

/**
 * GET /api/users/:id/prompts/latest
 * Get the latest active prompt for a user, optionally filtered by context.
 */
export async function getLatestPrompt(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const context = (req.query.context as string) || 'general';

  const prompt = await prisma.tonePrompt.findFirst({
    where: { userId: id, context, status: 'active' },
    orderBy: { version: 'desc' },
  });

  if (!prompt) {
    throw new NotFoundError(`Active tone prompt for context "${context}"`);
  }

  res.json(prompt);
}

/**
 * GET /api/users/:id/prompts/contexts
 * List available contexts for a user with their latest prompt info.
 */
export async function listContexts(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const prompts = await prisma.tonePrompt.findMany({
    where: { userId: id, status: 'active' },
    orderBy: { version: 'desc' },
    distinct: ['context'],
    select: {
      context: true,
      version: true,
      qualityScore: true,
      emailCount: true,
      createdAt: true,
    },
  });

  const emailCounts = await prisma.email.groupBy({
    by: ['context'],
    where: { userId: id, context: { not: null } },
    _count: { id: true },
  });

  const contexts = prompts.map((p) => ({
    context: p.context,
    latestVersion: p.version,
    qualityScore: p.qualityScore,
    promptEmailCount: p.emailCount,
    totalEmails: emailCounts.find((e) => e.context === p.context)?._count.id || 0,
    lastUpdated: p.createdAt,
  }));

  res.json({ contexts });
}

/**
 * POST /api/users/:id/prompts/regenerate
 * Trigger re-analysis for a user. Creates a processing job and enqueues it.
 */
export async function regeneratePrompt(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { context } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  // Check for existing pending/processing analysis job for same user+context
  const existingJob = await prisma.processingJob.findFirst({
    where: {
      userId: id,
      type: 'tone_analysis',
      status: { in: ['pending', 'processing'] },
      ...(context ? { context } : {}),
    },
  });

  if (existingJob) {
    throw new ConflictError(
      `A tone analysis job is already ${existingJob.status} for this user` +
      (context ? ` and context "${context}"` : '')
    );
  }

  // Create processing job
  const job = await prisma.processingJob.create({
    data: {
      userId: id,
      type: 'tone_analysis',
      status: 'pending',
      context: context || null,
    },
  });

  // Enqueue the analysis
  await enqueueToneAnalysis(id, job.id, context);

  logger.info(`Regeneration requested for user ${id}`, { jobId: job.id, context });

  res.status(202).json({
    jobId: job.id,
    status: 'pending',
    message: 'Tone analysis queued',
  });
}
