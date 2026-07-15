'use strict';

/**
 * Tiny dependency-free test for the wake/poll logic. Run with:
 *   node lib/wake.test.js
 *
 * Uses fake fetch / sleep / clock so it runs instantly with no network.
 */

const assert = require('assert');
const { waitForServer } = require('./wake');

let passed = 0;
function ok(name) {
    passed += 1;
    console.log('  ok - ' + name);
}

// A fake clock we advance manually via the injected sleep().
function makeClock() {
    let t = 0;
    return {
        now: () => t,
        sleep: async (ms) => {
            t += ms;
        },
        advance: (ms) => {
            t += ms;
        },
    };
}

/**
 * fetch stub: responder(url) => { status } | throws for network failure.
 */
function makeFetch(responder) {
    return async (url) => {
        const res = responder(String(url));
        if (res instanceof Error) {
            throw res;
        }
        return res;
    };
}

async function run() {
    // 1. Immediate success: /ping returns 200 on first try.
    {
        const clock = makeClock();
        const statuses = [];
        const result = await waitForServer(
            {
                fetchImpl: makeFetch(() => ({ status: 200 })),
                now: clock.now,
                sleep: clock.sleep,
                onStatus: (s) => statuses.push(s.phase),
            },
            {},
        );
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.reason, 'ready');
        assert.strictEqual(result.attempts, 1);
        assert.ok(statuses.includes('ready'));
        ok('returns ready immediately on 200');
    }

    // 2. Offline: /ping fails AND all connectivity probes fail on first attempt.
    {
        const clock = makeClock();
        const result = await waitForServer(
            {
                fetchImpl: makeFetch(() => new Error('ENETUNREACH')),
                now: clock.now,
                sleep: clock.sleep,
            },
            {},
        );
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, 'offline');
        assert.strictEqual(result.attempts, 1);
        ok('detects offline when ping + probes all fail');
    }

    // 3. Cold start: ping fails for a while (but internet is up), then 200.
    {
        const clock = makeClock();
        let pingCalls = 0;
        const fetchImpl = async (url) => {
            const u = String(url);
            if (u.endsWith('/ping')) {
                pingCalls += 1;
                // First 3 pings fail, 4th succeeds.
                if (pingCalls < 4) {
                    throw new Error('503-ish / connection reset');
                }
                return { status: 200 };
            }
            // Connectivity probe: internet is fine.
            return { status: 204 };
        };
        const phases = [];
        const result = await waitForServer(
            {
                fetchImpl,
                now: clock.now,
                sleep: clock.sleep,
                onStatus: (s) => phases.push(s.phase),
            },
            { pollIntervalMs: 5000, wakingHintMs: 20000 },
        );
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.reason, 'ready');
        assert.strictEqual(result.attempts, 4);
        // Elapsed should be ~3 sleeps of 5s = 15s.
        assert.strictEqual(result.elapsedMs, 15000);
        ok('recovers after cold start (server wakes on 4th ping)');
    }

    // 4. Timeout: ping never succeeds, internet is up -> reason 'timeout'.
    {
        const clock = makeClock();
        const fetchImpl = async (url) => {
            const u = String(url);
            if (u.endsWith('/ping')) {
                throw new Error('still asleep');
            }
            return { status: 204 }; // internet OK
        };
        let sawWaking = false;
        const result = await waitForServer(
            {
                fetchImpl,
                now: clock.now,
                sleep: clock.sleep,
                onStatus: (s) => {
                    if (s.phase === 'waking') {
                        sawWaking = true;
                    }
                },
            },
            { pollIntervalMs: 5000, maxWaitMs: 60000, wakingHintMs: 20000 },
        );
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, 'timeout');
        assert.ok(result.elapsedMs >= 60000);
        assert.ok(sawWaking, 'should have surfaced the waking-up hint');
        ok('gives up with timeout after maxWaitMs and shows waking hint');
    }

    console.log('\nAll ' + passed + ' wake.js tests passed.');
}

run().catch((err) => {
    console.error('TEST FAILURE:', err);
    process.exit(1);
});
