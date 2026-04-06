import { Router } from 'express';
import { apiKeyMiddleware } from '../middleware/api-key.middleware';
import { getLatestPromptPublic, getAvailableContextsPublic } from '../controllers/public-api.controller';

const router = Router();

/**
 * GET /api/public/prompts/latest
 * Fetch the latest tone prompt for a user by context.
 * Requires X-API-Key header.
 */
router.get('/prompts/latest', apiKeyMiddleware, getLatestPromptPublic);

/**
 * GET /api/public/prompts/contexts
 * List all available contexts for the authenticated user.
 * Requires X-API-Key header.
 */
router.get('/prompts/contexts', apiKeyMiddleware, getAvailableContextsPublic);

export default router;
