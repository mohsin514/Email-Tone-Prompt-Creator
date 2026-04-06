import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limiter';
import routes from './routes';
import { startEmailScheduler, stopEmailScheduler } from './cron/email-scheduler';
import { initializeSocketIO } from './services/socket.service';

// Import workers so they start processing
import './services/queue/workers/email-fetch.worker';
import './services/queue/workers/tone-analysis.worker';

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// Initialize Socket.IO
initializeSocketIO(httpServer);

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'http://localhost:5173'
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error Handler (must be last) ───────────────────────────────────────────
app.use(errorHandler);

// ── Server Startup ─────────────────────────────────────────────────────────
async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Verify Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    // Start the Express server with HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
    });

    // Start cron scheduler
    const cronExpr = process.env.EMAIL_FETCH_CRON || '*/15 * * * *';
    startEmailScheduler(cronExpr);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      stopEmailScheduler();
      httpServer.close();
      await prisma.$disconnect();
      await redis.quit();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
