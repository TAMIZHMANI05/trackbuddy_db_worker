export type DeviceStatus = 'MOVING' | 'IDLE' | 'PARKING' | 'INACTIVE';

export interface HeartbeatPayload {
    deviceId: string;
    imei: string;
    receivedAt: string | Date;
}

export interface ParsedPosition {
    deviceId: string;
    recordedAt: Date;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    altitude: number;
    accuracy: number;
    status: DeviceStatus;
    attributes: Record<string, unknown>;
}
