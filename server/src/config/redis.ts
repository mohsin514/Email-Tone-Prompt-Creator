import IORedis from 'ioredis';
import { logger } from './logger';

let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('❌ Redis error:', err));

export const createRedisConnection = () =>
  new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
