// @ts-expect-error — node-zklib ships without bundled types
import ZKLib from 'node-zklib';
import type { Config } from './config';
import { logger } from './logger';

export type DeviceLog = {
    pin: number;
    datetime: string;
};

export type DeviceUser = {
    pin: number;
    name: string;
};

/**
 * Pull attendance logs from the ZKTeco device via TCP (port 4370).
 * The device uses a proprietary binary protocol handled by node-zklib.
 */
export async function pullAttendanceLogs(cfg: Config['device']): Promise<DeviceLog[]> {
    const zk = new ZKLib(cfg.ip, cfg.port, cfg.timeout, cfg.inport);

    try {
        await zk.createSocket();
        logger.info(`[device] Connected to ${cfg.ip}:${cfg.port}`);

        const { data: logs } = await zk.getAttendances();

        if (!Array.isArray(logs)) {
            logger.warn('[device] No attendance data returned.');
            return [];
        }

        logger.info(`[device] Retrieved ${logs.length} attendance log(s).`);

        return logs.map((log: { userId: string; attTime: Date }) => ({
            pin: parseInt(log.userId, 10),
            datetime: formatDatetime(log.attTime),
        }));
    } finally {
        try {
            await zk.disconnect();
        } catch {
            // ignore disconnect errors
        }
    }
}

/**
 * Push employee enrollments to the device.
 * This requires the middleware to have LAN access to the device IP.
 */
export async function enrollEmployees(cfg: Config['device'], users: DeviceUser[]): Promise<void> {
    const zk = new ZKLib(cfg.ip, cfg.port, cfg.timeout, cfg.inport);

    try {
        await zk.createSocket();
        logger.info(`[device] Connected for enrollment to ${cfg.ip}:${cfg.port}`);

        for (const user of users) {
            await zk.setUser(user.pin, String(user.pin), user.name, '', 0, 0);
            logger.info(`[device] Enrolled PIN ${user.pin} (${user.name})`);
        }
    } finally {
        try {
            await zk.disconnect();
        } catch {
            // ignore
        }
    }
}

/** Format a Date object as 'YYYY-MM-DD HH:mm:ss' (device local time). */
function formatDatetime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}
