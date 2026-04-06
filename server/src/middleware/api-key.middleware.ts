import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface AuthenticatedPublicRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

/**
 * Middleware to authenticate public API requests via X-API-Key header.
 */
export async function apiKeyMiddleware(
  req: AuthenticatedPublicRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    res.status(401).json({ error: 'X-API-Key header is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
