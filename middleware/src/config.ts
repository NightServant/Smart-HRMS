import * as fs from 'fs';
import * as path from 'path';

export type Config = {
    device: {
        ip: string;
        port: number;
        serialNumber: string;
        timeout: number;
        inport: number;
    };
    cloud: {
        url: string;
        apiKey: string;
    };
    sync: {
        intervalMs: number;
        retryAfterMs: number;
        clearDeviceAfterSync: boolean;
    };
    buffer: {
        path: string;
    };
    enroll: {
        port: number;
    };
};

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.json');

if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
        `[config] config.json not found at ${CONFIG_PATH}.\n` +
        `Copy config.example.json to config.json and fill in your device details.`,
    );
    process.exit(1);
}

const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
const config: Config = JSON.parse(raw);

// Validate required fields
if (!config.device?.ip) throw new Error('config.device.ip is required');
if (!config.device?.serialNumber) throw new Error('config.device.serialNumber is required');
if (!config.cloud?.url) throw new Error('config.cloud.url is required');
if (!config.cloud?.apiKey) throw new Error('config.cloud.apiKey is required');

// Apply defaults
config.device.port ??= 4370;
config.device.timeout ??= 10000;
config.device.inport ??= 4000;
config.sync.intervalMs ??= 60000;
config.sync.retryAfterMs ??= 30000;
config.sync.clearDeviceAfterSync ??= false;
config.buffer.path ??= './data/buffer.sqlite';
config.enroll ??= { port: 8080 };

export default config;
