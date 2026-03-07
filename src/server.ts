import logger from './utils/logger';
import config from './configs/config';
import { initDatabase, closeDatabase } from './db/pool';
import { startWorker, stopWorker } from './queue/worker';
import http from 'http';

let isShuttingDown = false;

async function main(): Promise<void> {
    logger.info('DB_WORKER_STARTING', {
        meta: { ENV: config.ENV }
    });

    // 1. Connect to database
    await initDatabase();

    // 2. Start queue worker (consumer)
    startWorker();

    // 3. Health check HTTP server
    const healthServer = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'db-worker' }));
    });

    healthServer.listen(config.HEALTH_PORT, () => {
        logger.info('HEALTH_SERVER_LISTENING', {
            meta: { port: config.HEALTH_PORT }
        });
    });

    // 4. Graceful shutdown
    const shutdown = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        logger.info('SHUTDOWN_INITIATED', { meta: { signal } });

        healthServer.close();

        try {
            await stopWorker();
        } catch (err) {
            logger.error('SHUTDOWN_WORKER_ERROR', { meta: err });
        }

        try {
            await closeDatabase();
        } catch (err) {
            logger.error('SHUTDOWN_DB_ERROR', { meta: err });
        }

        logger.info('SHUTDOWN_COMPLETE');
        process.exit(0);
    };

    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.on('uncaughtException', (err: Error) => {
        logger.error('UNCAUGHT_EXCEPTION', { meta: err });
        void shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason: unknown) => {
        logger.error('UNHANDLED_REJECTION', { meta: { reason } });
        void shutdown('unhandledRejection');
    });
}

main().catch((err: unknown) => {
    logger.error('STARTUP_FATAL_ERROR', { meta: err });
    process.exit(1);
});
