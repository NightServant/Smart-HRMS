<?php

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\BiometricSyncIssue;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Services\Biometric\BiometricSyncService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zkbiotime.url' => 'https://zkbio.test',
        'services.zkbiotime.username' => 'admin',
        'services.zkbiotime.password' => 'admin',
        'services.zkbiotime.auth_mode' => 'jwt',
        'services.zkbiotime.page_size' => 10,
        'services.zkbiotime.default_terminal_sn' => 'TERM-A',
        'attendance.shift_start' => '09:00',
        'attendance.grace_period_minutes' => 0,
        'attendance.time_out_min_gap_minutes' => 60,
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-100',
        'name' => 'Sync Tester',
        'job_title' => 'QA',
        'zkteco_pin' => 'EMP-100',
    ]);
});

function fakeAuth(): void
{
    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'fake-token'], 200),
    ]);
}

function fakeTransactions(array $rows, ?string $next = null): void
{
    fakeAuth();
    Http::fake([
        'https://zkbio.test/iclock/api/transactions/*' => Http::response([
            'data' => $rows,
            'next' => $next,
        ], 200),
    ]);
}

test('sync inserts raw punches and aggregates daily attendance', function () {
    fakeTransactions([
        ['emp_code' => 'EMP-100', 'punch_time' => '2026-04-26 08:30:00', 'terminal_sn' => 'TERM-A', 'punch_state' => '0'],
        ['emp_code' => 'EMP-100', 'punch_time' => '2026-04-26 17:15:00', 'terminal_sn' => 'TERM-A', 'punch_state' => '1'],
    ]);

    $result = app(BiometricSyncService::class)->sync();

    expect($result->recordsFetched)->toBe(2);
    expect($result->recordsStored)->toBe(2);
    expect($result->issues)->toBe(0);

    expect(AttendanceRecord::query()->where('employee_id', 'EMP-100')->count())->toBe(2);

    $daily = DailyAttendance::query()->firstWhere(['employee_id' => 'EMP-100', 'date' => '2026-04-26']);
    expect($daily)->not->toBeNull();
    expect($daily->status)->toBe('on_time');
    expect($daily->time_in)->toBe('08:30:00');
    expect($daily->time_out)->toBe('17:15:00');

    $device = BiometricDevice::query()->where('serial_number', 'TERM-A')->first();
    expect($device->last_sync_stamp)->not->toBeNull();
});

test('subsequent sync of same data produces zero new rows and logs duplicate_punch issues', function () {
    fakeTransactions([
        ['emp_code' => 'EMP-100', 'punch_time' => '2026-04-26 08:30:00', 'terminal_sn' => 'TERM-A', 'punch_state' => '0'],
    ]);

    app(BiometricSyncService::class)->sync();

    Cache::flush();

    $result = app(BiometricSyncService::class)->sync();

    expect($result->recordsStored)->toBe(0);
    expect(AttendanceRecord::query()->count())->toBe(1);
    expect(BiometricSyncIssue::query()->where('issue_type', 'duplicate_punch')->count())->toBeGreaterThanOrEqual(1);
});

test('unknown PIN logs unknown_pin issue and skips the row', function () {
    fakeTransactions([
        ['emp_code' => 'GHOST-999', 'punch_time' => '2026-04-26 08:30:00', 'terminal_sn' => 'TERM-A', 'punch_state' => '0'],
    ]);

    $result = app(BiometricSyncService::class)->sync();

    expect($result->recordsStored)->toBe(0);
    expect($result->issues)->toBe(1);
    expect(BiometricSyncIssue::query()->where('issue_type', 'unknown_pin')->count())->toBe(1);
    expect(AttendanceRecord::query()->count())->toBe(0);
});

test('network failure logs api_error and does not advance cursor', function () {
    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'fake-token'], 200),
        'https://zkbio.test/iclock/api/transactions/*' => Http::response('boom', 500),
    ]);

    $device = BiometricDevice::query()->create([
        'serial_number' => 'TERM-A',
        'name' => 'A',
        'is_active' => true,
        'last_sync_stamp' => '2026-04-25 00:00:00',
    ]);

    $result = app(BiometricSyncService::class)->sync();

    $device->refresh();

    expect($result->issues)->toBeGreaterThanOrEqual(1);
    expect($device->last_sync_stamp)->toBe('2026-04-25 00:00:00');
    expect(BiometricSyncIssue::query()->where('issue_type', 'api_error')->count())->toBe(1);
});
