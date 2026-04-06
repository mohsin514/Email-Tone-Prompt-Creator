import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { regenerateLimiter } from '../middleware/rate-limiter';
import * as promptsController from '../controllers/prompts.controller';

const router = Router();

// All prompt routes require auth
router.use(authMiddleware);

/**
 * GET /api/users/:id/prompts
 * List all prompt versions.
 */
router.get('/:id/prompts', promptsController.listPrompts);

/**
 * GET /api/users/:id/prompts/latest
 * Get the latest active prompt.
 */
router.get('/:id/prompts/latest', promptsController.getLatestPrompt);

/**
 * GET /api/users/:id/prompts/contexts
 * List available contexts.
 */
router.get('/:id/prompts/contexts', promptsController.listContexts);

/**
 * POST /api/users/:id/prompts/regenerate
 * Trigger tone re-analysis (rate limited).
 */
router.post('/:id/prompts/regenerate', regenerateLimiter, promptsController.regeneratePrompt);

export default router;
