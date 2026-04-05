/**
 * IWR Bridge — Lightweight Node.js-to-Python bridge.
 *
 * Usage (called by Laravel's Process facade):
 *   echo '{"action":"route_leave","payload":{...}}' | node bridge.cjs
 *
 * Reads JSON from stdin, spawns Python runner.py, writes result to stdout.
 */

const { spawn } = require('child_process');
const { resolvePythonCommand } = require('../shared/resolve-python.cjs');

const IWR_DIR = __dirname;
const PYTHON = resolvePythonCommand(IWR_DIR, 'IWR_PYTHON_PATH');
const TIMEOUT_MS = 30000;

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
    const child = spawn(PYTHON.command, [...PYTHON.args, 'runner.py'], {
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
