import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { redis } from '../../config/redis';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate JWT access token (short-lived)
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate JWT refresh token (long-lived)
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(userId: string, email: string): TokenPair {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId, email);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.type !== 'access') {
      logger.warn('Token type mismatch: expected access, got ' + decoded.type);
      return null;
    }
    return decoded;
  } catch (error) {
    logger.debug('Access token verification failed:', { error: (error as Error).message });
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    if (decoded.type !== 'refresh') {
      logger.warn('Token type mismatch: expected refresh, got ' + decoded.type);
      return null;
    }
    return decoded;
  } catch (error) {
    logger.debug('Refresh token verification failed:', { error: (error as Error).message });
    return null;
  }
}

/**
 * Store refresh token in Redis for blacklist/revocation
 */
export async function storeRefreshToken(userId: string, token: string, expirySeconds: number = 7 * 24 * 60 * 60): Promise<void> {
  const key = `refresh_token:${userId}`;
  await redis.setex(key, expirySeconds, token);
  logger.debug(`Stored refresh token for user ${userId}`);
}

/**
 * Verify refresh token is in Redis (not revoked)
 */
export async function isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
  const key = `refresh_token:${userId}`;
  const stored = await redis.get(key);
  return stored === token;
}

/**
 * Revoke refresh token (logout)
 */
export async function revokeRefreshToken(userId: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  await redis.del(key);
  logger.info(`Revoked refresh token for user ${userId}`);
}

/**
 * Hash password (simple bcrypt-like - use bcrypt in production)
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or argon2
  // For now, using simple implementation - DO NOT use in production!
  const encoder = new TextEncoder();
  const data = encoder.encode(password + process.env.PASSWORD_SALT || 'dev-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(email: string, password: string): Promise<{ userId: string; tokens: TokenPair } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      logger.warn(`Authentication failed for email: ${email} (user not found or no password)`);
      return null;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      logger.warn(`Authentication failed for email: ${email} (password mismatch)`);
      return null;
    }

    const tokens = generateTokenPair(user.id, user.email);
    await storeRefreshToken(user.id, tokens.refreshToken);

    logger.info(`User authenticated successfully: ${email}`);

    return {
      userId: user.id,
      tokens,
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      logger.warn('Invalid refresh token');
      return null;
    }

    // Check if token is in Redis (not revoked)
    const isValid = await isRefreshTokenValid(payload.userId, refreshToken);
    if (!isValid) {
      logger.warn(`Refresh token not found or revoked for user ${payload.userId}`);
      return null;
    }

    // Get updated user info
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      logger.warn(`User not found during token refresh: ${payload.userId}`);
      return null;
    }

    // Generate new token pair
    const newTokens = generateTokenPair(user.id, user.email);
    await storeRefreshToken(user.id, newTokens.refreshToken);

    logger.info(`Token refreshed for user ${user.id}`);

    return newTokens;
  } catch (error) {
    logger.error('Token refresh error:', error);
    return null;
  }
}
