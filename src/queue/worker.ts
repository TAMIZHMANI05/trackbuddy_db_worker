import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { ParsedPosition } from '../types';
import { batchInsertPositions, updateDeviceStatus } from '../db/queries';
import config from '../configs/config';
import logger from '../utils/logger';

let worker: Worker | null = null;
let batchBuffer: ParsedPosition[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Flush accumulated positions to the database.
 */
async function flushBatch(): Promise<void> {
    if (batchBuffer.length === 0) return;

    const batch = [...batchBuffer];
    batchBuffer = [];

    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    try {
        // Batch insert all positions
        await batchInsertPositions(batch);

        // Update device status for each unique device
        const deviceUpdates = new Map<string, ParsedPosition>();
        for (const pos of batch) {
            // Keep the latest position per device (by recorded_at)
            const existing = deviceUpdates.get(pos.deviceId);
            if (!existing || pos.recordedAt > existing.recordedAt) {
                deviceUpdates.set(pos.deviceId, pos);
            }
        }

        // Update device statuses
        await Promise.all(Array.from(deviceUpdates.values()).map((pos) => updateDeviceStatus(pos.deviceId, pos.status)));

        logger.info('BATCH_PROCESSED', {
            meta: { positions: batch.length, devices: deviceUpdates.size }
        });
    } catch (err) {
        logger.error('BATCH_FLUSH_ERROR', { meta: { count: batch.length, error: err } });
        // Don't throw - jobs will be marked failed individually
    }
}

/**
 * Schedule a flush after FLUSH_INTERVAL_MS if not already scheduled.
 */
function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushBatch().catch((err: unknown) => {
            logger.error('SCHEDULED_FLUSH_ERROR', { meta: err });
        });
    }, config.FLUSH_INTERVAL_MS);
}

/**
 * Start the queue worker.
 * Batches positions and flushes when BATCH_SIZE is reached or after FLUSH_INTERVAL_MS.
 */
export function startWorker(): void {
    if (worker) {
        logger.warn('WORKER_ALREADY_RUNNING');
        return;
    }

    worker = new Worker<ParsedPosition>(
        config.QUEUE_NAME,
        async (job: Job<ParsedPosition>) => {
            // Add to batch buffer
            batchBuffer.push(job.data);

            // Flush if batch size reached
            if (batchBuffer.length >= config.BATCH_SIZE) {
                await flushBatch();
            } else {
                // Schedule a flush if not already scheduled
                scheduleFlush();
            }
        },
        {
            connection: redisConnection,
            concurrency: 1, // Process jobs sequentially to maintain batch order
            limiter: {
                max: 1000,
                duration: 1000
            }
        }
    );

    worker.on('ready', () => {
        logger.info('WORKER_READY', {
            meta: { batchSize: config.BATCH_SIZE, flushInterval: config.FLUSH_INTERVAL_MS }
        });
    });

    worker.on('failed', (job, err: Error) => {
        const deviceId = job?.data ? (job.data as ParsedPosition).deviceId : undefined;
        logger.error('WORKER_JOB_FAILED', {
            meta: { jobId: job?.id, deviceId, error: err }
        });
    });

    worker.on('error', (err) => {
        logger.error('WORKER_ERROR', { meta: err });
    });
}

/**
 * Stop the worker and flush any remaining positions.
 */
export async function stopWorker(): Promise<void> {
    if (!worker) return;

    // Flush any remaining positions
    await flushBatch();

    await worker.close();
    worker = null;
    logger.info('WORKER_STOPPED');
}
