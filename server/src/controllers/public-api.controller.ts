import { Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AuthenticatedPublicRequest } from '../middleware/api-key.middleware';
import { NotFoundError } from '../middleware/error-handler';

/**
 * GET /api/public/prompts/latest
 * Fetch the latest tone prompt for a user by context.
 * Authenticated via X-API-Key.
 */
export async function getLatestPromptPublic(
  req: AuthenticatedPublicRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.id;
  const context = (req.query.context as string) || 'general';

  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  try {
    const prompt = await prisma.tonePrompt.findFirst({
      where: { 
        userId, 
        context,
        status: 'active' 
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        context: true,
        version: true,
        toneText: true,
        styleTraits: true,
        qualityScore: true,
        consistency: true,
        createdAt: true,
      }
    });

    if (!prompt) {
      if (context === 'general') {
        // Fallback to any active prompt if 'general' is requested but not found
        const fallback = await prisma.tonePrompt.findFirst({
          where: { userId, status: 'active' },
          orderBy: { createdAt: 'desc' },
        });
        
        if (!fallback) {
          throw new NotFoundError(`Active prompt for user`);
        }
        res.json(fallback);
        return;
      }
      throw new NotFoundError(`Active prompt for context: ${context}`);
    }

    logger.info(`Public API prompt fetch: ${userId} (${context})`);
    res.json(prompt);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Public API prompt fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
}

/**
 * GET /api/public/prompts/contexts
 * List all available contexts for the authenticated user.
 */
export async function getAvailableContextsPublic(
  req: AuthenticatedPublicRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  try {
    const contexts = await prisma.tonePrompt.groupBy({
      by: ['context'],
      where: { userId, status: 'active' },
    });

    res.json({
      userId,
      contexts: contexts.map(c => c.context),
    });
  } catch (error) {
    logger.error('Public API contexts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch contexts' });
  }
}
