/**
 * PPE Bridge — Lightweight Node.js-to-Python bridge.
 *
 * Usage (called by Laravel Process facade):
 *   echo '{"action":"predict","payload":{...}}' | node bridge.cjs
 */

const { spawn } = require('child_process');
const path = require('path');
const { resolvePythonCommand } = require('../shared/resolve-python.cjs');

const PYTHON = resolvePythonCommand(__dirname, 'PPE_PYTHON_PATH', [
    path.resolve(__dirname, '..', 'iwr'),
]);
// 28s — just under the 30s PHP Process timeout, 2× the old limit so
// cold-start numpy/sklearn imports on the free tier don't get killed.
const TIMEOUT = 28000;

let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
    const child = spawn(PYTHON.command, [...PYTHON.args, 'runner.py'], {
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
            // code===null means the process was killed by a signal (SIGTERM/SIGKILL).
            // Python may have already written a complete result before being killed
            // in its exit phase — try to recover that output before erroring.
            if (code === null && stdout.trim()) {
                try {
                    const parsed = JSON.parse(stdout.trim());
                    if (parsed && parsed.status !== 'error') {
                        process.stdout.write(stdout.trim());
                        return;
                    }
                } catch (_) {}
            }
            process.stdout.write(JSON.stringify({
                status: 'error',
                notification: `Python exited with code ${code}: ${stderr || stdout}`,
            }));
            process.exit(1);
            return;
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
