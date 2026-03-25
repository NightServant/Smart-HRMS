/**
 * FlatFAT Bridge — Lightweight Node.js-to-Python bridge.
 *
 * Usage (called by Laravel Process facade):
 *   echo '{"action":"employee_score","payload":{...}}' | node bridge.cjs
 */

const { spawn } = require('child_process');
const path = require('path');

// Detect Python path - try common locations
const PYTHON = [
    path.resolve(__dirname, '.venv', 'bin', 'python'),      // Local venv
    path.resolve(__dirname, '..', 'venv', 'bin', 'python'), // Parent venv
    'python3',                                               // System python3
    'python',                                                // System python
].find(p => {
    try {
        if (require('fs').existsSync(p)) return true;
        if (p === 'python3' || p === 'python') return true; // Assume system Python exists
    } catch {
        return false;
    }
    return false;
});

const TIMEOUT = 30000; // 30s timeout for FlatFAT

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
