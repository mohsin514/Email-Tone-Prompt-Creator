import { Queue } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';

// ── Queue Definitions ──────────────────────────────────────────────────────
export const emailFetchQueue = new Queue('email-fetch', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const toneAnalysisQueue = new Queue('tone-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// ── Job Enqueueing Helpers ─────────────────────────────────────────────────

/**
 * Enqueue an email fetch job for a specific user.
 */
export async function enqueueEmailFetch(userId: string, options?: { maxResults?: number }) {
  const job = await emailFetchQueue.add(
    'fetch-emails',
    { userId, maxResults: options?.maxResults || 500 },
    { jobId: `email-fetch-${userId}-${Date.now()}` }
  );
  logger.info(`Enqueued email fetch job for user ${userId}`, { jobId: job.id });
  return job;
}

/**
 * Enqueue a tone analysis job for a specific user and optional context.
 */
export async function enqueueToneAnalysis(
  userId: string,
  jobId: string,
  context?: string
) {
  const job = await toneAnalysisQueue.add(
    'analyze-tone',
    { userId, jobId, context },
    { jobId: `tone-analysis-${userId}-${Date.now()}` }
  );
  logger.info(`Enqueued tone analysis job for user ${userId}`, {
    jobId: job.id,
    context: context || 'all',
  });
  return job;
}

/**
 * Get queue health stats for monitoring.
 */
export async function getQueueStats() {
  const [emailFetchCounts, toneAnalysisCounts] = await Promise.all([
    emailFetchQueue.getJobCounts(),
    toneAnalysisQueue.getJobCounts(),
  ]);

  return {
    emailFetch: emailFetchCounts,
    toneAnalysis: toneAnalysisCounts,
  };
}
