export type DeviceStatus = 'MOVING' | 'IDLE' | 'PARKING' | 'INACTIVE';

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
