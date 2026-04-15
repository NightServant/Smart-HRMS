/**
 * Smart HRMS — ZKTeco Local Middleware Bridge
 *
 * Responsibilities:
 *   1. Pull attendance logs from the ZKTeco device via TCP (port 4370).
 *   2. Buffer records locally in SQLite for offline resilience.
 *   3. Push buffered records to the Railway-hosted Laravel API.
 *   4. Expose a local HTTP endpoint (/enroll) so the cloud can push
 *      employee enrollments to the device via this bridge.
 *
 * Setup:
 *   1. Copy config.example.json → config.json and fill in your values.
 *   2. npm install && npm run build
 *   3. npm start
 */
import * as http from 'http';
import { initBuffer } from './buffer';
import config from './config';
import { enrollEmployees } from './device';
import { logger } from './logger';
import { startSyncLoop } from './sync';

// ── Initialise SQLite buffer ──────────────────────────────────────────────────
initBuffer(config.buffer.path);

// ── Start the main sync loop ──────────────────────────────────────────────────
startSyncLoop();

// ── Local HTTP server for enrollment push (Mode 2 / optional) ────────────────
// The Laravel cloud calls POST http://<device-ip>:8080/enroll with employee data.
// This bridge then forwards the enrollment to the device via ZKLib.
const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/enroll') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
        try {
            const payload = JSON.parse(body) as {
                employees: Array<{ pin: number; name: string }>;
            };

            if (!Array.isArray(payload.employees) || payload.employees.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'employees array is required' }));
                return;
            }

            logger.info(`[enroll] Enrolling ${payload.employees.length} employee(s) on device.`);
            await enrollEmployees(config.device, payload.employees);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', enrolled: payload.employees.length }));
        } catch (err) {
            logger.error('[enroll] Error:', err instanceof Error ? err.message : err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
        }
    });
});

server.listen(config.enroll.port, '127.0.0.1', () => {
    logger.info(`[enroll] Local enrollment server listening on 127.0.0.1:${config.enroll.port}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
    logger.info('[main] SIGTERM received — shutting down.');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    logger.info('[main] SIGINT received — shutting down.');
    server.close(() => process.exit(0));
});

logger.info('[main] ZKTeco bridge started.');
logger.info(`[main] Device: ${config.device.serialNumber} @ ${config.device.ip}:${config.device.port}`);
logger.info(`[main] Cloud:  ${config.cloud.url}`);
