const fs = require('fs');
const path = require('path');

function resolveVenvPython(directory, isWindows) {
    return isWindows
        ? path.join(directory, '.venv', 'Scripts', 'python.exe')
        : path.join(directory, '.venv', 'bin', 'python');
}

function resolvePythonCommand(serviceDir, envVariable, extraSearchDirectories = []) {
    const isWindows = process.platform === 'win32';
    const candidates = [];

    if (process.env[envVariable]) {
        candidates.push({
            command: process.env[envVariable],
            args: [],
        });
    }

    for (const directory of [serviceDir, ...extraSearchDirectories]) {
        candidates.push({
            command: resolveVenvPython(directory, isWindows),
            args: [],
        });
    }

    if (isWindows) {
        candidates.push({
            command: 'py',
            args: ['-3'],
        });
    }

    candidates.push(
        { command: 'python3', args: [] },
        { command: 'python', args: [] },
    );

    for (const candidate of candidates) {
        if (path.isAbsolute(candidate.command)) {
            if (fs.existsSync(candidate.command)) {
                return candidate;
            }

            continue;
        }

        return candidate;
    }

    return candidates[candidates.length - 1];
}

module.exports = {
    resolvePythonCommand,
};
