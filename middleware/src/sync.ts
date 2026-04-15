import { pushToCloud } from './api';
import { bufferRecords, getUnsentRecords, markAsSynced } from './buffer';
import config from './config';
import { pullAttendanceLogs } from './device';
import { logger } from './logger';

let running = false;

export async function runSyncCycle(): Promise<void> {
    if (running) {
        logger.warn('[sync] Previous cycle still running — skipping.');
        return;
    }

    running = true;

    try {
        // 1. Pull logs from device
        let logs: Array<{ pin: number; datetime: string }> = [];
        try {
            logs = await pullAttendanceLogs(config.device);
        } catch (err) {
            logger.error('[sync] Failed to pull from device:', err instanceof Error ? err.message : err);
            // Device unreachable — still try to push any buffered records
        }

        // 2. Buffer all pulled records (idempotent — duplicates are ignored)
        if (logs.length > 0) {
            bufferRecords(logs);
        }

        // 3. Push all un-synced buffered records to the cloud
        const unsent = getUnsentRecords();

        if (unsent.length === 0) {
            logger.info('[sync] Nothing to push.');
            return;
        }

        try {
            await pushToCloud(
                config.cloud,
                config.device.serialNumber,
                unsent.map((r) => ({ pin: r.pin, datetime: r.datetime })),
            );
            markAsSynced(unsent.map((r) => r.id));
        } catch (err) {
            logger.error('[sync] Failed to push to cloud — will retry next cycle:', err instanceof Error ? err.message : err);
            // Records stay as synced=0 in the buffer; next cycle retries
        }
    } finally {
        running = false;
    }
}

export function startSyncLoop(): void {
    logger.info(`[sync] Starting sync loop (interval: ${config.sync.intervalMs}ms)`);

    const tick = async () => {
        await runSyncCycle();
        setTimeout(tick, config.sync.intervalMs);
    };

    // Start after a short delay to allow other services to initialise
    setTimeout(tick, 2000);
}
