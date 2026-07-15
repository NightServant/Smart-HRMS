'use strict';

/**
 * Connectivity + cold-start wake logic for the Smart HRMS desktop wrapper.
 *
 * This module is deliberately free of any Electron dependency so it can be
 * unit-tested under plain Node. The Electron main process injects a `fetchImpl`
 * (Node 18+ global fetch) and a `sleep` function; tests inject fakes.
 */

const SERVER_URL = 'https://smart-hrms.onrender.com/';
const PING_URL = 'https://smart-hrms.onrender.com/ping';

// A generic connectivity probe used to distinguish "the user is offline"
// from "the Smart HRMS server is asleep / down".
const CONNECTIVITY_PROBES = [
    'https://www.google.com/generate_204',
    'https://cloudflare.com/cdn-cgi/trace',
    'https://www.apple.com/library/test/success.html',
];

const DEFAULTS = {
    // How often to re-check /ping while waiting for a cold start.
    pollIntervalMs: 5000,
    // Total time to wait for the server to wake before giving up (7 minutes).
    maxWaitMs: 7 * 60 * 1000,
    // Per-request timeout for a single /ping attempt.
    pingTimeoutMs: 8000,
    // Per-request timeout for a connectivity probe.
    probeTimeoutMs: 6000,
    // After this much elapsed time, surface the "server is waking up" message.
    wakingHintMs: 20000,
};

/**
 * Fetch a URL with an AbortController-based timeout.
 * Resolves to `true` on any HTTP response with an ok/2xx-or-3xx-ish status
 * for probes, or a specific status check for /ping (handled by callers).
 */
async function fetchWithTimeout(fetchImpl, url, timeoutMs, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetchImpl(url, {
            ...options,
            signal: controller.signal,
            redirect: 'follow',
            cache: 'no-store',
        });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Attempt a single /ping. Returns true only on HTTP 200.
 */
async function pingOnce(fetchImpl, opts = {}) {
    const timeout = opts.pingTimeoutMs ?? DEFAULTS.pingTimeoutMs;
    try {
        const res = await fetchWithTimeout(fetchImpl, PING_URL, timeout);
        return res.status === 200;
    } catch (_err) {
        return false;
    }
}

/**
 * Probe generic internet connectivity. Returns true if ANY probe responds
 * (any HTTP status counts — we only care that a response came back, meaning
 * the network path works).
 */
async function hasInternet(fetchImpl, opts = {}) {
    const timeout = opts.probeTimeoutMs ?? DEFAULTS.probeTimeoutMs;
    const probes = opts.probes ?? CONNECTIVITY_PROBES;
    for (const url of probes) {
        try {
            const res = await fetchWithTimeout(fetchImpl, url, timeout);
            if (res) {
                return true;
            }
        } catch (_err) {
            // Try the next probe.
        }
    }
    return false;
}

/**
 * Poll /ping until it returns 200 or the max wait elapses.
 *
 * @param {object} deps
 * @param {Function} deps.fetchImpl  - fetch implementation
 * @param {Function} [deps.sleep]    - async (ms) => void
 * @param {Function} [deps.now]      - () => epoch ms
 * @param {Function} [deps.onStatus] - ({ phase, elapsedMs, attempt }) => void
 * @param {object}   [opts]          - overrides of DEFAULTS
 * @returns {Promise<{ ok: boolean, reason: string, elapsedMs: number, attempts: number }>}
 *   reason is one of: 'ready' | 'timeout' | 'offline'
 */
async function waitForServer(deps, opts = {}) {
    const fetchImpl = deps.fetchImpl;
    const sleep =
        deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    const now = deps.now || (() => Date.now());
    const onStatus = deps.onStatus || (() => {});

    const cfg = { ...DEFAULTS, ...opts };
    const start = now();
    let attempt = 0;

    // Fast path + offline detection on the very first attempt.
    onStatus({ phase: 'connecting', elapsedMs: 0, attempt: 0 });

    while (true) {
        attempt += 1;
        const elapsedMs = now() - start;

        const ok = await pingOnce(fetchImpl, cfg);
        if (ok) {
            onStatus({ phase: 'ready', elapsedMs: now() - start, attempt });
            return {
                ok: true,
                reason: 'ready',
                elapsedMs: now() - start,
                attempts: attempt,
            };
        }

        // Ping failed. On the first failure, check whether the user is offline
        // entirely (vs. the server merely being asleep).
        if (attempt === 1) {
            const online = await hasInternet(fetchImpl, cfg);
            if (!online) {
                onStatus({
                    phase: 'offline',
                    elapsedMs: now() - start,
                    attempt,
                });
                return {
                    ok: false,
                    reason: 'offline',
                    elapsedMs: now() - start,
                    attempts: attempt,
                };
            }
        }

        const elapsedAfter = now() - start;
        if (elapsedAfter >= cfg.maxWaitMs) {
            onStatus({
                phase: 'timeout',
                elapsedMs: elapsedAfter,
                attempt,
            });
            return {
                ok: false,
                reason: 'timeout',
                elapsedMs: elapsedAfter,
                attempts: attempt,
            };
        }

        const phase =
            elapsedAfter >= cfg.wakingHintMs ? 'waking' : 'connecting';
        onStatus({ phase, elapsedMs: elapsedAfter, attempt });

        // Don't oversleep past the deadline.
        const remaining = cfg.maxWaitMs - (now() - start);
        if (remaining <= 0) {
            continue;
        }
        await sleep(Math.min(cfg.pollIntervalMs, remaining));
    }
}

module.exports = {
    SERVER_URL,
    PING_URL,
    CONNECTIVITY_PROBES,
    DEFAULTS,
    pingOnce,
    hasInternet,
    waitForServer,
    fetchWithTimeout,
};
