import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../../config/redis';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { fetchEmailsFromProvider, EmailProvider } from '../../email/email.factory';
import { classifyEmailContexts } from '../../ai/context-classifier';
import { enqueueToneAnalysis } from '../queue.service';
import { broadcastJobUpdate } from '../../socket.service';

interface EmailFetchJobData {
  userId: string;
  maxResults?: number;
}

/**
 * Worker that processes email fetch jobs.
 * Fetches sent emails from the user's provider, stores them,
 * classifies their context, then enqueues tone analysis.
 */
export const emailFetchWorker = new Worker<EmailFetchJobData>(
  'email-fetch',
  async (job: Job<EmailFetchJobData>) => {
    const { userId, maxResults = 500 } = job.data;

    logger.info(`[Worker] Starting email fetch for user ${userId}`, { jobId: job.id });
    broadcastJobUpdate(userId, job.id || '', 'processing', { type: 'email-fetch' });

    // 1. Load user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // 2. Update job status in DB
    const dbJob = await prisma.processingJob.findFirst({
      where: { userId, type: 'email_fetch', status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    if (dbJob) {
      await prisma.processingJob.update({
        where: { id: dbJob.id },
        data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
      });
      broadcastJobUpdate(userId, dbJob.id, 'processing', {
        type: 'email-fetch',
        dbJobId: dbJob.id
      });
    }

    try {
      // 3. Find the most recent email we already have to avoid re-fetching
      const latestEmail = await prisma.email.findFirst({
        where: { userId },
        orderBy: { sentAt: 'desc' },
      });

      // 4. Fetch emails from provider
      let providerToUse = user.provider;
      if (user.provider === 'password' && user.gmailAccessToken) {
        providerToUse = 'gmail';
      }

      const emails = await fetchEmailsFromProvider(
        providerToUse as EmailProvider,
        {
          accessToken: user.gmailAccessToken || undefined,
          refreshToken: user.gmailRefreshToken || undefined,
          tokenExpiry: user.gmailTokenExpiry || undefined,
          userId: user.id,
        },
        {
          afterDate: latestEmail?.sentAt || undefined,
          maxResults,
        }
      );

      logger.info(`[Worker] Fetched ${emails.length} new emails for user ${userId}`);

      if (emails.length === 0) {
        if (dbJob) {
          await prisma.processingJob.update({
            where: { id: dbJob.id },
            data: { status: 'completed', completedAt: new Date() },
          });
        }
        return { emailCount: 0 };
      }

      // 5. Store emails (upsert to handle duplicates)
      let storedCount = 0;
      for (const email of emails) {
        try {
          await prisma.email.upsert({
            where: {
              userId_providerId: { userId, providerId: email.providerId },
            },
            create: {
              userId,
              providerId: email.providerId,
              subject: email.subject,
              body: email.body,
              recipients: email.recipients as any,
              sentAt: email.sentAt,
              metadata: email.metadata,
            },
            update: {}, // Don't update if already exists
          });
          storedCount++;
        } catch (err) {
          logger.warn(`Failed to store email ${email.providerId}:`, { error: (err as Error).message });
        }
      }

      logger.info(`[Worker] Stored ${storedCount} emails for user ${userId}`);

      // 6. Classify unclassified emails
      const unclassified = await prisma.email.findMany({
        where: { userId, context: null },
        select: { id: true, subject: true, body: true, recipients: true },
      });

      if (unclassified.length > 0) {
        const classifications = await classifyEmailContexts(
          unclassified.map((e) => ({
            id: e.id,
            subject: e.subject || undefined,
            body: e.body,
            recipients: e.recipients,
          }))
        );

        for (const classification of classifications) {
          await prisma.email.update({
            where: { id: classification.emailId },
            data: { context: classification.context },
          });
        }

        logger.info(`[Worker] Classified ${classifications.length} emails`);
      }

      // 7. Enqueue tone analysis
      const analysisJob = await prisma.processingJob.create({
        data: {
          userId,
          type: 'tone_analysis',
          status: 'pending',
        },
      });

      await enqueueToneAnalysis(userId, analysisJob.id);

      // 8. Complete the fetch job
      if (dbJob) {
        await prisma.processingJob.update({
          where: { id: dbJob.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        broadcastJobUpdate(userId, dbJob.id, 'completed', {
          type: 'email-fetch',
          emailCount: storedCount,
          analysisJobId: analysisJob.id
        });
      }

      return { emailCount: storedCount, analysisJobId: analysisJob.id };
    } catch (error) {
      if (dbJob) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await prisma.processingJob.update({
          where: { id: dbJob.id },
          data: {
            status: 'failed',
            errorMessage,
          },
        });
        broadcastJobUpdate(userId, dbJob.id, 'failed', {
          type: 'email-fetch',
          error: errorMessage
        });
      }
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
    limiter: { max: 5, duration: 60000 },
  }
);

emailFetchWorker.on('completed', (job) => {
  logger.info(`[Worker] Email fetch job completed: ${job.id}`);
});

emailFetchWorker.on('failed', (job, error) => {
  logger.error(`[Worker] Email fetch job failed: ${job?.id}`, { error: error.message });
});
