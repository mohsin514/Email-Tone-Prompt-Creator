import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Socket.IO service for real-time updates
 * Allows clients to subscribe to job status updates
 */

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN || 'http://localhost:5173'
        : '*',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // User subscribes to their job updates
    socket.on('subscribe-jobs', (userId: string) => {
      const room = `user-jobs:${userId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} subscribed to ${room}`);

      socket.emit('subscribed', { room, message: 'Subscribed to job updates' });
    });

    // User unsubscribes
    socket.on('unsubscribe-jobs', (userId: string) => {
      const room = `user-jobs:${userId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

/**
 * Emit real-time job status update to a user
 */
export function broadcastJobUpdate(userId: string, jobId: string, status: string, data?: any) {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot broadcast');
    return;
  }

  const room = `user-jobs:${userId}`;
  io.to(room).emit('job-update', {
    jobId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  });

  logger.debug(`Broadcasted job update to ${room}`, { jobId, status });
}

/**
 * Emit admin queue stats update
 */
export function broadcastAdminStats(stats: any) {
  if (!io) return;

  io.to('admin-stats').emit('stats-update', {
    ...stats,
    timestamp: new Date().toISOString(),
  });

  logger.debug('Broadcasted admin stats update');
}

/**
 * Admin subscribes to queue stats
 */
export function subscribeAdminStats(socket: Socket) {
  socket.on('subscribe-admin-stats', () => {
    socket.join('admin-stats');
    logger.debug(`Admin socket subscribed to stats: ${socket.id}`);
    socket.emit('subscribed', { room: 'admin-stats' });
  });

  socket.on('unsubscribe-admin-stats', () => {
    socket.leave('admin-stats');
    logger.debug(`Admin socket unsubscribed from stats: ${socket.id}`);
  });
}

/**
 * Get Socket.IO instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}
