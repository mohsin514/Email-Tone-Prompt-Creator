import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { getQueueStats, enqueueToneAnalysis, enqueueEmailFetch } from '../services/queue/queue.service';
import { NotFoundError } from '../middleware/error-handler';
import { parsePagination, buildPaginatedResult } from '../utils/pagination';

/**
 * GET /api/admin/stats
 * System-wide stats: queue health, user/email/prompt counts.
 */
export async function getStats(_req: Request, res: Response): Promise<void> {
  const [queueStats, userCount, emailCount, promptCount, jobStats] = await Promise.all([
    getQueueStats(),
    prisma.user.count(),
    prisma.email.count(),
    prisma.tonePrompt.count({ where: { status: 'active' } }),
    prisma.processingJob.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  const recentJobs = await prisma.processingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  const jobStatusCounts: Record<string, number> = {};
  for (const stat of jobStats) {
    jobStatusCounts[stat.status] = stat._count.id;
  }

  res.json({
    queue: queueStats,
    counts: {
      users: userCount,
      emails: emailCount,
      activePrompts: promptCount,
    },
    jobs: jobStatusCounts,
    recentJobs,
  });
}

/**
 * GET /api/admin/users
 * List all users with prompt/email summary.
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, any>);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        createdAt: true,
        _count: {
          select: {
            emails: true,
            tonePrompts: true,
            processingJobs: true,
          },
        },
      },
    }),
    prisma.user.count(),
  ]);

  // Enrich with latest prompt quality score
  const enriched = await Promise.all(
    users.map(async (user) => {
      const latestPrompt = await prisma.tonePrompt.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { qualityScore: 'desc' },
        select: { qualityScore: true, context: true, createdAt: true },
      });

      return {
        ...user,
        latestQualityScore: latestPrompt?.qualityScore || null,
        lastPromptDate: latestPrompt?.createdAt || null,
      };
    })
  );

  res.json(buildPaginatedResult(enriched, total, pagination));
}

/**
 * GET /api/admin/users/:id
 * Detailed user view with all prompts, emails, and jobs.
 */
export async function getUserDetail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          emails: true,
          tonePrompts: true,
          processingJobs: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  const [activePrompts, recentJobs, emailContexts] = await Promise.all([
    prisma.tonePrompt.findMany({
      where: { userId: id, status: 'active' },
      orderBy: { context: 'asc' },
    }),
    prisma.processingJob.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.email.groupBy({
      by: ['context'],
      where: { userId: id },
      _count: { id: true },
    }),
  ]);

  res.json({
    user,
    activePrompts,
    recentJobs,
    emailsByContext: emailContexts.map((e) => ({
      context: e.context || 'unclassified',
      count: e._count.id,
    })),
  });
}

/**
 * POST /api/admin/users/:id/regenerate
 * Admin-triggered regeneration (same as user regenerate but from admin panel).
 */
export async function adminRegenerate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { context } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const job = await prisma.processingJob.create({
    data: {
      userId: id,
      type: 'tone_analysis',
      status: 'pending',
      context: context || null,
    },
  });

  await enqueueToneAnalysis(id, job.id, context);

  logger.info(`Admin triggered regeneration for user ${id}`, { jobId: job.id });

  res.status(202).json({
    jobId: job.id,
    status: 'pending',
    message: 'Tone analysis queued by admin',
  });
}

/**
 * POST /api/admin/users/:id/fetch-emails
 * Admin-triggered email fetch for a specific user.
 */
export async function adminFetchEmails(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const job = await prisma.processingJob.create({
    data: {
      userId: id,
      type: 'email_fetch',
      status: 'pending',
    },
  });

  await enqueueEmailFetch(id);

  logger.info(`Admin triggered email fetch for user ${id}`, { jobId: job.id });

  res.status(202).json({
    jobId: job.id,
    status: 'pending',
    message: 'Email fetch queued by admin',
  });
}
