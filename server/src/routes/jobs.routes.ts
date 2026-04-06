import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as jobsController from '../controllers/jobs.controller';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/jobs
 * List all processing jobs with filters.
 */
router.get('/', jobsController.listJobs);

/**
 * GET /api/jobs/:id
 * Get a single job with details.
 */
router.get('/:id', jobsController.getJob);

export default router;
