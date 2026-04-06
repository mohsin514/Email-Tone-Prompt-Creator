import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/admin/stats
 * System-wide statistics.
 */
router.get('/stats', adminController.getStats);

/**
 * GET /api/admin/users
 * List all users with prompt summaries.
 */
router.get('/users', adminController.listUsers);

/**
 * GET /api/admin/users/:id
 * Detailed user view.
 */
router.get('/users/:id', adminController.getUserDetail);

/**
 * POST /api/admin/users/:id/regenerate
 * Admin-triggered regeneration.
 */
router.post('/users/:id/regenerate', adminController.adminRegenerate);

/**
 * POST /api/admin/users/:id/fetch-emails
 * Admin-triggered email fetch.
 */
router.post('/users/:id/fetch-emails', adminController.adminFetchEmails);

export default router;
