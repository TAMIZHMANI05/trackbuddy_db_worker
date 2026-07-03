import config from '../configs/config';
import logger from '../utils/logger';

// BullMQ connection options (not an instantiated Redis client)
export const redisConnection = {
    host: new URL(config.REDIS_URL).hostname,
    port: parseInt(new URL(config.REDIS_URL).port || '6379', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
};

logger.info('REDIS_CONFIG_LOADED', {
    meta: {
        host: redisConnection.host,
        port: redisConnection.port
    }
});
