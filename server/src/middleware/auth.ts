import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try JWT token from Authorization header first (for frontend)
  const authHeader = req.headers.authorization;
  console.log('[AuthMiddleware] Checking auth for:', req.method, req.path);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any;
      console.log('[AuthMiddleware] JWT verified for user:', decoded.userId);
      // JWT payload has userId (not id), so map it correctly
      req.user = { id: decoded.userId, email: decoded.email };
      return next();
    } catch (error: any) {
      console.error('[AuthMiddleware] JWT Verification error:', error.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token', details: error.message });
      return;
    }
  }

  // Fallback to API key (for backend services)
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY || 'dev-api-key';

  if (apiKey && apiKey === expectedKey) {
    console.log('[AuthMiddleware] Valid API Key found');
    return next();
  }

  console.error(`[AuthMiddleware] Authentication failed. No valid JWT or API key provided`);
  res.status(401).json({ error: 'Unauthorized: Missing or invalid credentials' });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  // For public endpoints — just pass through
  next();
}
