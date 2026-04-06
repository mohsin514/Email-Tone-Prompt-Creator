import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError } from '../middleware/error-handler';
import { parsePagination, buildPaginatedResult } from '../utils/pagination';

/**
 * GET /api/admin/jobs
 * List all processing jobs with filters.
 */
export async function listJobs(req: Request, res: Response): Promise<void> {
  const { status, type, userId } = req.query;
  const pagination = parsePagination(req.query as Record<string, any>);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (userId) where.userId = userId;

  const [jobs, total] = await Promise.all([
    prisma.processingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { tonePrompts: true } },
      },
    }),
    prisma.processingJob.count({ where }),
  ]);

  res.json(buildPaginatedResult(jobs, total, pagination));
}

/**
 * GET /api/admin/jobs/:id
 * Get a single job with full details.
 */
export async function getJob(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const job = await prisma.processingJob.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      tonePrompts: true,
    },
  });

  if (!job) throw new NotFoundError('Processing job');

  res.json(job);
}
