import pool from './pool';
import { ParsedPosition, DeviceStatus } from '../types';
import logger from '../utils/logger';

/**
 * Batch insert positions into the positions table.
 * Uses ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography for PostGIS point insertion.
 */
export async function batchInsertPositions(positions: ParsedPosition[]): Promise<void> {
    if (positions.length === 0) return;

    try {
        // Build parameterized query with unnest arrays
        const deviceIds: string[] = [];
        const recordedAts: Date[] = [];
        const lngs: number[] = [];
        const lats: number[] = [];
        const speeds: number[] = [];
        const headings: number[] = [];
        const altitudes: number[] = [];
        const accuracies: number[] = [];
        const statuses: DeviceStatus[] = [];
        const attributes: string[] = [];

        for (const pos of positions) {
            deviceIds.push(pos.deviceId);
            recordedAts.push(pos.recordedAt);
            lngs.push(pos.longitude);
            lats.push(pos.latitude);
            speeds.push(pos.speed);
            headings.push(pos.heading);
            altitudes.push(pos.altitude);
            accuracies.push(pos.accuracy);
            statuses.push(pos.status);
            attributes.push(JSON.stringify(pos.attributes));
        }

        const query = `
            INSERT INTO positions (
                device_id, recorded_at, location, speed, heading, altitude, accuracy, status, attributes
            )
            SELECT
                device_id,
                recorded_at,
                ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
                speed,
                heading,
                altitude,
                accuracy,
                status::"Bus_Status",
                attributes::jsonb
            FROM UNNEST(
                $1::varchar(50)[],
                $2::timestamp[],
                $3::float[],
                $4::float[],
                $5::float[],
                $6::float[],
                $7::float[],
                $8::float[],
                $9::text[],
                $10::text[]
            ) AS t(device_id, recorded_at, lng, lat, speed, heading, altitude, accuracy, status, attributes)
        `;

        await pool.query(query, [deviceIds, recordedAts, lngs, lats, speeds, headings, altitudes, accuracies, statuses, attributes]);

        logger.info('POSITIONS_INSERTED', { meta: { count: positions.length } });
    } catch (err) {
        logger.error('DB_BATCH_INSERT_ERROR', { meta: { count: positions.length, error: err } });
        throw err;
    }
}

/**
 * Update device's last_update and device_status.
 */
export async function updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    try {
        await pool.query('UPDATE devices SET device_status = $1, last_update = NOW(), "updatedAt" = NOW() WHERE id = $2', [status, deviceId]);
    } catch (err) {
        logger.error('DB_UPDATE_DEVICE_ERROR', { meta: { deviceId, status, error: err } });
        throw err;
    }
}
