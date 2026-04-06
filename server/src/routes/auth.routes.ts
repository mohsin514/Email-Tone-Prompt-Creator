import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
} from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';

const router = Router();

/**
 * Public authentication endpoints
 */

/**
 * POST /auth/register
 * Register a new user with email and password
 * Body: { email: string, name?: string, password: string }
 */
router.post('/register', registerUser);

/**
 * POST /auth/login
 * Login user with email and password
 * Body: { email: string, password: string }
 */
router.post('/login', loginUser);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Body: { refreshToken: string }
 */
router.post('/refresh', refreshUserToken);

/**
 * Protected authentication endpoints
 */

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 * Headers: { Authorization: "Bearer <accessToken>" }
 * Body: { refreshToken: string }
 */
router.post('/logout', jwtAuthMiddleware, logoutUser);

/**
 * GET /auth/me
 * Get current authenticated user profile
 * Headers: { Authorization: "Bearer <accessToken>" }
 */
router.get('/me', jwtAuthMiddleware, getCurrentUser);

/**
 * PUT /auth/me
 * Update current user profile
 * Headers: { Authorization: "Bearer <accessToken>" }
 * Body: { name: string }
 */
router.put('/me', jwtAuthMiddleware, updateUserProfile);

export default router;
