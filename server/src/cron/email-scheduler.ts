import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { enqueueEmailFetch } from '../services/queue/queue.service';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Start the cron scheduler that periodically fetches emails for all users.
 */
export function startEmailScheduler(cronExpression: string = '*/15 * * * *') {
  if (scheduledTask) {
    logger.warn('Email scheduler already running');
    return;
  }

  logger.info(`Starting email scheduler with cron: "${cronExpression}"`);

  scheduledTask = cron.schedule(cronExpression, async () => {
    logger.info('[Cron] Starting scheduled email fetch for all users');

    try {
      // Find all users with valid Gmail credentials (accessToken present)
      const users = await prisma.user.findMany({
        where: {
          gmailAccessToken: { not: null },
        },
        select: { id: true, email: true, provider: true },
      });

      logger.info(`[Cron] Found ${users.length} users with credentials`);

      for (const user of users) {
        try {
          // Check if there's already a pending/processing fetch job
          const existingJob = await prisma.processingJob.findFirst({
            where: {
              userId: user.id,
              type: 'email_fetch',
              status: { in: ['pending', 'processing'] },
            },
          });

          if (existingJob) {
            logger.info(`[Cron] Skipping user ${user.email}: fetch already in progress`);
            continue;
          }

          // Create a processing job record
          const dbJob = await prisma.processingJob.create({
            data: {
              userId: user.id,
              type: 'email_fetch',
              status: 'pending',
            },
          });

          // Enqueue the fetch
          await enqueueEmailFetch(user.id);

          logger.info(`[Cron] Enqueued email fetch for user ${user.email}`, {
            jobId: dbJob.id,
          });
        } catch (error) {
          logger.error(`[Cron] Failed to enqueue fetch for user ${user.email}:`, {
            error: (error as Error).message,
          });
        }
      }
    } catch (error) {
      logger.error('[Cron] Scheduled email fetch failed:', { error: (error as Error).message });
    }
  });
}

/**
 * Stop the cron scheduler.
 */
export function stopEmailScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Email scheduler stopped');
  }
}
