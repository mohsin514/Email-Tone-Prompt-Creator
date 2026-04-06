import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { regenerateLimiter } from '../middleware/rate-limiter';
import * as userController from '../controllers/user.controller';

const router = Router();

// All user routes require auth
router.use(authMiddleware);

/**
 * GET /api/users/:id/profile
 * Get user profile with summary stats
 */
router.get('/:id/profile', userController.getUserProfile);

/**
 * GET /api/users/:id/emails
 * List user's emails with filters and pagination
 */
router.get('/:id/emails', userController.getUserEmails);

/**
 * GET /api/users/:id/jobs
 * List user's processing jobs
 */
router.get('/:id/jobs', userController.getUserJobs);

/**
 * GET /api/users/:id/prompts/:promptId
 * Get specific prompt detail
 */
router.get('/:id/prompts/:promptId', userController.getPromptDetail);

/**
 * GET /api/users/:id/analytics
 * Get insights about user's email patterns and prompts
 */
router.get('/:id/analytics', userController.getUserAnalytics);

export default router;
