/**
 * IWR Bridge — Lightweight Node.js-to-Python bridge.
 *
 * Usage (called by Laravel's Process facade):
 *   echo '{"action":"route_leave","payload":{...}}' | node bridge.cjs
 *
 * Reads JSON from stdin, spawns Python runner.py, writes result to stdout.
 */

const { spawn } = require('child_process');
const path = require('path');

const IWR_DIR = __dirname;
const IS_WIN = process.platform === 'win32';
const VENV_PYTHON = IS_WIN
    ? path.join(IWR_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(IWR_DIR, '.venv', 'bin', 'python');
const PYTHON_PATH = process.env.IWR_PYTHON_PATH || VENV_PYTHON;
const TIMEOUT_MS = 30000;

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
    const child = spawn(PYTHON_PATH, ['runner.py'], {
        cwd: IWR_DIR,
        timeout: TIMEOUT_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
        if (code !== 0) {
            process.stdout.write(JSON.stringify({
                status: 'error',
                notification: `Python exited with code ${code}: ${stderr || stdout}`,
            }));
            process.exit(1);
        }
        process.stdout.write(stdout.trim());
    });

    child.on('error', (err) => {
        process.stdout.write(JSON.stringify({
            status: 'error',
            notification: `Failed to spawn Python: ${err.message}`,
        }));
        process.exit(1);
    });

    child.stdin.write(input);
    child.stdin.end();
});
