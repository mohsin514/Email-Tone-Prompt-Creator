import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth/jwt.service';
import { logger } from '../config/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

/**
 * Middleware to verify JWT access token from Authorization header
 * Extracts bearer token and validates it
 */
export function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }

    // Attach user info to request object
    req.userId = payload.userId;
    req.email = payload.email;

    logger.info(`JWT authenticated user: ${payload.email} (${payload.userId})`);
    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional JWT middleware - doesn't reject if token is missing
 * Useful for endpoints that can work both authenticated and unauthenticated
 */
export function optionalJwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without auth
      next();
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (payload) {
      req.userId = payload.userId;
      req.email = payload.email;
      logger.info(`Optional JWT authenticated user: ${payload.email}`);
    }

    next();
  } catch (error) {
    logger.warn('Optional JWT authentication error (continuing):', error);
    next(); // Don't reject, just continue
  }
}

/**
 * Middleware to ensure user owns the requested resource
 * Usage: attach to routes where users access their own data
 */
export function ownsResourceMiddleware(paramName: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const requestedUserId = req.params[paramName];

      if (req.userId !== requestedUserId) {
        logger.warn(`Unauthorized resource access: ${req.email} tried to access ${paramName}=${requestedUserId}`);
        res.status(403).json({ error: 'You do not have permission to access this resource' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
}
