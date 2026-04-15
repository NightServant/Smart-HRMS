import axios from 'axios';
import type { Config } from './config';
import { logger } from './logger';

export type AttendanceRecord = {
    pin: number;
    datetime: string;
};

/**
 * Push attendance records to the Laravel backend via the middleware-push endpoint.
 * Requires a valid device API key set as the Bearer token.
 */
export async function pushToCloud(
    cfg: Config['cloud'],
    serialNumber: string,
    records: AttendanceRecord[],
): Promise<void> {
    if (records.length === 0) return;

    logger.info(`[api] Pushing ${records.length} record(s) to ${cfg.url}`);

    await axios.post(
        `${cfg.url}/api/iclock/middleware-push`,
        { serialNumber, records },
        {
            headers: {
                Authorization: `Bearer ${cfg.apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30_000,
        },
    );

    logger.info(`[api] Push successful.`);
}
