import { Response } from 'express';
import { prisma } from '../config/database';
import {
  generateTokenPair,
  authenticateUser,
  refreshAccessToken,
  hashPassword,
  revokeRefreshToken,
} from '../services/auth/jwt.service';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/jwt-auth';

/**
 * User registration endpoint
 * Creates a new user account with email and password
 */
export async function registerUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { email, name, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        provider: 'password',
      },
    });

    logger.info(`New user registered: ${email}`);

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = generateTokenPair(user.id, user.email);

    // Return tokens and user info
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
      expiresIn,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * User login endpoint
 * Authenticates user with email and password, returns JWT tokens
 */
export async function loginUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Authenticate user
    const result = await authenticateUser(email, password);

    if (!result) {
      logger.warn(`Failed login attempt for: ${email}`);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    logger.info(`User logged in: ${email}`);

    // Return tokens and user info
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Token refresh endpoint
 * Accepts refresh token and returns new access token pair
 */
export async function refreshUserToken(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    // Refresh the token
    const newTokens = await refreshAccessToken(refreshToken);

    if (!newTokens) {
      logger.warn('Failed token refresh with invalid refresh token');
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    logger.info(`Token refreshed`);

    // Return new tokens
    res.status(200).json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: newTokens.expiresIn,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}

/**
 * User logout endpoint
 * Revokes refresh token to prevent further use
 */
export async function logoutUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    // Revoke the refresh token
    await revokeRefreshToken(req.userId);

    logger.info(`User logged out: ${req.email}`);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * Get current user profile
 * Returns authenticated user's profile information
 */
export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
}

/**
 * Update user profile
 * Updates user name and other non-sensitive fields
 */
export async function updateUserProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });

    logger.info(`User profile updated: ${req.email}`);

    res.status(200).json({ user });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
