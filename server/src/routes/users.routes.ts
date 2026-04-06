import { Router } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { NotFoundError } from '../middleware/error-handler';
import { parsePagination, buildPaginatedResult } from '../utils/pagination';
import { getGmailAuthUrl, handleGmailCallback, isGmailLinked, unlinkGmail } from '../services/auth/oauth.service';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/users
 * List all users.
 */
router.get('/', authMiddleware, async (req, res) => {
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
        _count: { select: { emails: true, tonePrompts: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json(buildPaginatedResult(users, total, pagination));
});

/**
 * POST /api/users
 * Create a new user.
 */
router.post('/', authMiddleware, async (req, res) => {
  const { email, name, provider } = req.body;

  const user = await prisma.user.create({
    data: { email, name, provider: provider || 'password' },
  });

  res.status(201).json(user);
});

/**
 * GET /api/users/:id
 * Get a single user including Gmail link status.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  // Verify user owns this profile
  if (req.user?.id !== req.params.id) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      gmailEmail: true,
      gmailLinkedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { emails: true, tonePrompts: true, processingJobs: true } },
    },
  });

  if (!user) throw new NotFoundError('User');
  
  const gmailLinked = await isGmailLinked(req.params.id);
  
  res.json({ ...user, gmailLinked });
});

/**
 * GET /api/users/:id/auth/gmail
 * Get Gmail OAuth2 authorization URL for a user.
 */
router.get('/:id/auth/gmail', authMiddleware, async (req, res) => {
  try {
    // Verify user owns this profile
    if (req.user?.id !== req.params.id) {
      res.status(403).json({ error: 'Unauthorized: Cannot access another user\'s profile' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new NotFoundError('User');

    const authUrl = getGmailAuthUrl(req.params.id);
    logger.info(`Gmail auth URL generated for user ${req.params.id}`);
    res.json({ authUrl });
  } catch (error) {
    logger.error('Get Gmail auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate Gmail auth URL' });
  }
});

/**
 * POST /api/users/:id/auth/gmail/callback
 * Handle Gmail OAuth2 callback — exchange code for tokens.
 */
router.post('/:id/auth/gmail/callback', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    // Verify user owns this profile
    if (req.user?.id !== req.params.id) {
      res.status(403).json({ error: 'Unauthorized: Cannot access another user\'s profile' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new NotFoundError('User');

    const result = await handleGmailCallback(code, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Gmail callback error:', error);
    res.status(500).json({ error: 'Failed to process Gmail callback' });
  }
});

/**
 * POST /api/users/:id/auth/gmail/unlink
 * Unlink Gmail from user account.
 */
router.post('/:id/auth/gmail/unlink', authMiddleware, async (req, res) => {
  try {
    // Verify user owns this profile
    if (req.user?.id !== req.params.id) {
      res.status(403).json({ error: 'Unauthorized: Cannot access another user\'s profile' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new NotFoundError('User');

    await unlinkGmail(req.params.id);
    logger.info(`Gmail unlinked for user ${req.params.id}`);
    res.json({ message: 'Gmail account unlinked successfully' });
  } catch (error) {
    logger.error('Unlink Gmail error:', error);
    res.status(500).json({ error: 'Failed to unlink Gmail' });
  }
});

export default router;
