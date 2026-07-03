import { Pool, PoolConfig } from 'pg';
import config from '../configs/config';
import logger from '../utils/logger';

const poolConfig: PoolConfig = {
    connectionString: config.DATABASE_URL,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
};

const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
    logger.error('POSTGRES_POOL_ERROR', { meta: err });
});

// Health check on startup
export async function initDatabase(): Promise<void> {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        const dbName = config.DATABASE_URL?.split('@')[1]?.split('/')[1]?.split('?')[0] || 'unknown';
        logger.info('DATABASE_CONNECTED', {
            meta: { database: dbName }
        });
    } catch (err) {
        logger.error('DATABASE_CONNECTION_FAILED', { meta: err });
        throw err;
    }
}

export async function closeDatabase(): Promise<void> {
    await pool.end();
    logger.info('DATABASE_CLOSED');
}

export default pool;
