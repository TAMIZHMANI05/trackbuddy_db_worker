import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

const config = {
    ENV: process.env.ENV || 'development',
    SOCKET_TIMEOUT_MS: parseInt(process.env.SOCKET_TIMEOUT_MS || '300000', 10),
    MAX_CONNECTIONS: parseInt(process.env.MAX_CONNECTIONS || '10000', 10),
    DATABASE_URL: process.env.DATABASE_URL || '',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '50', 10),
    FLUSH_INTERVAL_MS: parseInt(process.env.FLUSH_INTERVAL_MS || '2000', 10),
    HEALTH_PORT: parseInt(process.env.HEALTH_PORT || '8081', 10),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    QUEUE_NAME: process.env.QUEUE_NAME || 'positions'
} as const;

export default config;
