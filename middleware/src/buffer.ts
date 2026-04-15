import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { logger } from './logger';

export type BufferedRecord = {
    id: number;
    pin: number;
    datetime: string;
    synced: number;
    created_at: string;
};

let db: Database.Database;

export function initBuffer(dbPath: string): void {
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(path.resolve(dbPath));

    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_buffer (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            pin         INTEGER NOT NULL,
            datetime    TEXT    NOT NULL,
            synced      INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_buffer_pin_datetime
            ON attendance_buffer (pin, datetime);
    `);

    logger.info(`[buffer] SQLite buffer initialised at ${path.resolve(dbPath)}`);
}

/** Insert records, ignoring duplicates (same pin+datetime). */
export function bufferRecords(records: Array<{ pin: number; datetime: string }>): void {
    const insert = db.prepare(
        `INSERT OR IGNORE INTO attendance_buffer (pin, datetime) VALUES (?, ?)`,
    );

    const insertMany = db.transaction((rows: Array<{ pin: number; datetime: string }>) => {
        for (const row of rows) {
            insert.run(row.pin, row.datetime);
        }
    });

    insertMany(records);
    logger.info(`[buffer] Buffered ${records.length} record(s).`);
}

/** Return all un-synced records. */
export function getUnsentRecords(): BufferedRecord[] {
    return db
        .prepare(`SELECT * FROM attendance_buffer WHERE synced = 0 ORDER BY datetime ASC`)
        .all() as BufferedRecord[];
}

/** Mark records as synced by their IDs. */
export function markAsSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    db.prepare(`UPDATE attendance_buffer SET synced = 1 WHERE id IN (${placeholders})`).run(...ids);
    logger.info(`[buffer] Marked ${ids.length} record(s) as synced.`);
}
