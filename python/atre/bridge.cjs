/**
 * ATRE Bridge — Lightweight Node.js-to-Python bridge.
 *
 * Usage (called by Laravel Process facade):
 *   echo '{"action":"recommend","payload":{...}}' | node bridge.cjs
 */

const { spawn } = require('child_process');
const path = require('path');

const IS_WIN = process.platform === 'win32';
const PYTHON = IS_WIN
    ? path.resolve(__dirname, '..', 'iwr', '.venv', 'Scripts', 'python.exe')
    : path.resolve(__dirname, '..', 'iwr', '.venv', 'bin', 'python');
const TIMEOUT = 15000;

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
    const child = spawn(PYTHON, ['runner.py'], {
        cwd: __dirname,
        timeout: TIMEOUT,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

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
