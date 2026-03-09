import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { HeartbeatPayload } from '../types';
import { updateDeviceLastUpdate } from '../db/queries';
import config from '../configs/config';
import logger from '../utils/logger';

let heartbeatWorker: Worker<HeartbeatPayload> | null = null;

/**
 * Start the heartbeat queue worker.
 * Updates device last_update timestamp on each heartbeat.
 */
export function startHeartbeatWorker(): void {
    if (heartbeatWorker) {
        logger.warn('HEARTBEAT_WORKER_ALREADY_RUNNING');
        return;
    }

    heartbeatWorker = new Worker<HeartbeatPayload>(
        config.HEARTBEAT_QUEUE_NAME,
        async (job: Job<HeartbeatPayload>) => {
            const { deviceId, receivedAt } = job.data;
            await updateDeviceLastUpdate(deviceId, receivedAt);
        },
        {
            connection: redisConnection,
            concurrency: 5
        }
    );

    heartbeatWorker.on('ready', () => {
        logger.info('HEARTBEAT_WORKER_READY', {
            meta: { queue: config.HEARTBEAT_QUEUE_NAME }
        });
    });

    heartbeatWorker.on('failed', (job, err: Error) => {
        logger.error('HEARTBEAT_JOB_FAILED', {
            meta: { jobId: job?.id, error: err }
        });
    });

    heartbeatWorker.on('error', (err) => {
        logger.error('HEARTBEAT_WORKER_ERROR', { meta: err });
    });
}

/**
 * Stop the heartbeat worker.
 */
export async function stopHeartbeatWorker(): Promise<void> {
    if (!heartbeatWorker) return;

    await heartbeatWorker.close();
    heartbeatWorker = null;
    logger.info('HEARTBEAT_WORKER_STOPPED');
}
