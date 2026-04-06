import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../../config/redis';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { analyzeTone } from '../../ai/tone-analyzer';
import { calculateQualityScore } from '../../scoring/quality-scorer';
import { broadcastJobUpdate } from '../../socket.service';

interface ToneAnalysisJobData {
  userId: string;
  jobId: string;
  context?: string; // If provided, only analyze this context
}

/**
 * Worker that processes tone analysis jobs.
 * Loads user emails, runs LLM analysis, calculates quality score,
 * and stores a versioned tone prompt.
 */
export const toneAnalysisWorker = new Worker<ToneAnalysisJobData>(
  'tone-analysis',
  async (job: Job<ToneAnalysisJobData>) => {
    const { userId, jobId, context } = job.data;

    logger.info(`[Worker] Starting tone analysis for user ${userId}`, {
      jobId,
      context: context || 'all',
    });
    broadcastJobUpdate(userId, jobId, 'processing', { 
      type: 'tone-analysis',
      context: context || 'all'
    });

    // 1. Update processing job status
    try {
      const dbJob = await prisma.processingJob.findUnique({ where: { id: jobId } });
      if (!dbJob) {
        logger.warn(`[Worker] Skipping tone analysis: Job record ${jobId} not found in database (possibly deleted during reset)`);
        return { status: 'skipped', reason: 'Job record not found' };
      }

      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
      });
      broadcastJobUpdate(userId, jobId, 'processing', { type: 'tone-analysis' });
    } catch (err) {
      logger.error(`[Worker] Failed to update job status:`, { error: (err as Error).message });
      return { status: 'failed', error: 'Job status update failed' };
    }

    try {
      // 2. Determine which contexts to analyze
      const contexts = context
        ? [context]
        : ['general', 'client', 'internal', 'casual'];

      const results: Array<{ context: string; promptId: string }> = [];

      for (const ctx of contexts) {
        // 3. Load emails for this context
        const where: any = { userId };
        if (ctx !== 'general') {
          where.context = ctx;
        }

        const emails = await prisma.email.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          take: 100, // Analyze up to 100 most recent emails
          select: {
            id: true,
            subject: true,
            body: true,
            sentAt: true,
          },
        });

        if (emails.length < 3) {
          logger.info(`[Worker] Skipping context "${ctx}": only ${emails.length} emails (need 3+)`);
          continue;
        }

        logger.info(`[Worker] Analyzing ${emails.length} emails for context "${ctx}"`);

        // 4. Run tone analysis via LLM
        const analysis = await analyzeTone(
          emails.map((e) => ({
            subject: e.subject || undefined,
            body: e.body.substring(0, 2000), // Truncate long bodies
            sentAt: e.sentAt.toISOString(),
          }))
        );

        // 5. Calculate quality score
        const qualityResult = calculateQualityScore({
          emailCount: emails.length,
          consistency: analysis.consistency,
          emailDates: emails.map((e) => e.sentAt),
        });

        // 6. Get next version number
        const latestPrompt = await prisma.tonePrompt.findFirst({
          where: { userId, context: ctx },
          orderBy: { version: 'desc' },
        });

        const nextVersion = (latestPrompt?.version || 0) + 1;

        // 7. Mark previous active prompt as superseded
        if (latestPrompt && latestPrompt.status === 'active') {
          await prisma.tonePrompt.update({
            where: { id: latestPrompt.id },
            data: { status: 'superseded' },
          });
        }

        // 8. Create new tone prompt
        const newPrompt = await prisma.tonePrompt.create({
          data: {
            userId,
            context: ctx,
            version: nextVersion,
            toneText: analysis.tonePrompt,
            styleTraits: analysis.styleTraits as any,
            qualityScore: qualityResult.qualityScore,
            emailCount: emails.length,
            consistency: analysis.consistency,
            recencyScore: qualityResult.recencyScore,
            status: 'active',
            jobId,
          },
        });

        results.push({ context: ctx, promptId: newPrompt.id });

        logger.info(`[Worker] Created tone prompt v${nextVersion} for context "${ctx}"`, {
          qualityScore: qualityResult.qualityScore,
          consistency: analysis.consistency,
          emailCount: emails.length,
        });
      }

      // 9. Mark job as completed
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: { results } as any,
        },
      });

      logger.info(`[Worker] Tone analysis completed for user ${userId}`, {
        contextsProcessed: results.length,
      });

      broadcastJobUpdate(userId, jobId, 'completed', { 
        type: 'tone-analysis',
        contextsProcessed: results.length,
        results
      });

      return { results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
        },
      });
      broadcastJobUpdate(userId, jobId, 'failed', { 
        type: 'tone-analysis',
        error: errorMessage
      });
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 1, // Process one at a time due to LLM rate limits
    limiter: { max: 3, duration: 60000 },
  }
);

toneAnalysisWorker.on('completed', (job) => {
  logger.info(`[Worker] Tone analysis job completed: ${job.id}`);
});

toneAnalysisWorker.on('failed', (job, error) => {
  logger.error(`[Worker] Tone analysis job failed: ${job?.id}`, { error: error.message });
});
