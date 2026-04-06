import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError } from '../middleware/error-handler';
import { parsePagination, buildPaginatedResult } from '../utils/pagination';

/**
 * GET /api/me
 * Get current user profile (requires user-specific API key or session)
 * TODO: Implement when user auth mechanism is defined
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  // This would be used with user-specific tokens instead of global API keys
  throw new NotFoundError('This endpoint requires user-specific authentication');
}

/**
 * GET /api/users/:id/profile
 * Get user profile with summary stats
 */
export async function getUserProfile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
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
  });

  if (!user) throw new NotFoundError('User');

  // Get latest prompts summary
  const latestPrompts = await prisma.tonePrompt.findMany({
    where: { userId: id, status: 'active' },
    orderBy: { context: 'asc' },
    select: {
      id: true,
      context: true,
      version: true,
      qualityScore: true,
      createdAt: true,
    },
  });

  // Get email statistics
  const emailStats = await prisma.email.groupBy({
    by: ['context'],
    where: { userId: id, context: { not: null } },
    _count: { id: true },
  });

  res.json({
    user,
    prompts: {
      count: latestPrompts.length,
      items: latestPrompts,
    },
    emailStats: emailStats.map((e) => ({
      context: e.context || 'unclassified',
      count: e._count.id,
    })),
  });
}

/**
 * GET /api/users/:id/emails
 * List user's stored emails with pagination and filtering
 */
export async function getUserEmails(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { context, search } = req.query;
  const pagination = parsePagination(req.query as Record<string, any>);

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const where: any = { userId: id };
  if (context) where.context = context;
  if (search) {
    const searchTerm = `%${search}%`;
    where.OR = [
      { subject: { contains: searchTerm, mode: 'insensitive' } },
      { body: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      select: {
        id: true,
        subject: true,
        body: true,
        context: true,
        sentAt: true,
        recipients: true,
      },
      orderBy: { sentAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.email.count({ where }),
  ]);

  res.json(buildPaginatedResult(emails, total, pagination));
}

/**
 * GET /api/users/:id/jobs
 * List user's processing jobs with pagination
 */
export async function getUserJobs(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, type } = req.query;
  const pagination = parsePagination(req.query as Record<string, any>);

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  const where: any = { userId: id };
  if (status) where.status = status;
  if (type) where.type = type;

  const [jobs, total] = await Promise.all([
    prisma.processingJob.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        context: true,
        errorMessage: true,
        attempts: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.processingJob.count({ where }),
  ]);

  res.json(buildPaginatedResult(jobs, total, pagination));
}

/**
 * GET /api/users/:id/prompts/:promptId
 * Get a specific prompt with full details
 */
export async function getPromptDetail(req: Request, res: Response): Promise<void> {
  const { id, promptId } = req.params;

  const prompt = await prisma.tonePrompt.findUnique({
    where: { id: promptId },
  });

  if (!prompt || prompt.userId !== id) {
    throw new NotFoundError('Prompt');
  }

  res.json(prompt);
}

/**
 * GET /api/users/:id/analytics
 * Get analytics/insights about user's email patterns
 */
export async function getUserAnalytics(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  // Email count by context
  const emailsByContext = await prisma.email.groupBy({
    by: ['context'],
    where: { userId: id },
    _count: { id: true },
  });

  // Emails by date (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEmails = await prisma.email.groupBy({
    by: ['sentAt'],
    where: {
      userId: id,
      sentAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });

  // Prompt quality trends
  const prompts = await prisma.tonePrompt.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      context: true,
      version: true,
      toneText: true,
      styleTraits: true,
      qualityScore: true,
      consistency: true,
      createdAt: true,
    },
    take: 50,
  });

  logger.info(`Generated analytics for user ${id}`, {
    contextsCount: emailsByContext.length,
    promptsCount: prompts.length,
  });

  const averageScore = prompts.length > 0 
    ? prompts.reduce((sum, p) => sum + p.qualityScore, 0) / prompts.length 
    : 0;

  res.json({
    totalEmails: emailsByContext.reduce((sum, e) => sum + e._count.id, 0),
    analyzedEmails: emailsByContext.reduce((sum, e) => sum + e._count.id, 0), // Assuming all processed
    averageScore,
    toneDistribution: emailsByContext.reduce((acc, e) => {
      acc[e.context || 'unclassified'] = e._count.id;
      return acc;
    }, {} as Record<string, number>),
    emailsByContext: emailsByContext.map((e) => ({
      context: e.context || 'unclassified',
      count: e._count.id,
    })),
    recentEmailsCount: recentEmails.reduce((sum, e) => sum + e._count.id, 0),
    prompts: {
      total: prompts.length,
      list: prompts.map(p => ({
        context: p.context,
        version: p.version,
        qualityScore: p.qualityScore,
        consistency: p.consistency,
        toneText: (p as any).toneText,
        styleTraits: (p as any).styleTraits,
        createdAt: p.createdAt
      })),
      byContext: prompts.reduce(
        (acc, p) => {
          if (!acc[p.context]) acc[p.context] = [];
          acc[p.context].push({
            version: p.version,
            qualityScore: p.qualityScore,
            consistency: p.consistency,
            toneText: (p as any).toneText,
            styleTraits: (p as any).styleTraits,
            createdAt: p.createdAt,
          });
          return acc;
        },
        {} as Record<string, any[]>
      ),
    },
  });
}
