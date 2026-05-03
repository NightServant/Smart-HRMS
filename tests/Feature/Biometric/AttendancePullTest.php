<?php

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\Employee;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zlink.url' => 'https://zlink-open.test',
        'services.zlink.app_key' => 'test-app-key',
        'services.zlink.app_secret' => 'test-app-secret',
    ]);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-400',
        'name' => 'Attendance Pull User',
        'job_title' => 'Clerk',
        'zkteco_pin' => 'EMP400',
    ]);
});

test('happy path: pulls a new punch and stores it with daily aggregation', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/att/v1/transactions/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'list' => [
                    [
                        'employeeCode' => 'EMP400',
                        'checkTime' => '2026-05-03 08:30:00',
                        'areaName' => 'Office',
                    ],
                ],
            ],
        ], 200),
    ]);

    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(0);

    $record = AttendanceRecord::query()
        ->where('employee_id', 'EMP-400')
        ->where('punch_time', '2026-05-03 08:30:00')
        ->first();

    expect($record)->not->toBeNull();
    expect($record->source)->toBe('biometric');
    expect($record->date->format('Y-m-d'))->toBe('2026-05-03');

    // DailyAttendance should have been recomputed.
    $daily = DailyAttendance::query()
        ->where('employee_id', 'EMP-400')
        ->whereDate('date', '2026-05-03')
        ->first();

    expect($daily)->not->toBeNull();
    expect($daily->time_in)->toBe('08:30:00');
});

test('deduplication: a second pull of the same punch does not create a duplicate', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/att/v1/transactions/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'list' => [
                    ['employeeCode' => 'EMP400', 'checkTime' => '2026-05-03 08:30:00'],
                ],
            ],
        ], 200),
    ]);

    // Run twice to simulate overlapping windows.
    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(0);

    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(0);

    $count = AttendanceRecord::query()
        ->where('employee_id', 'EMP-400')
        ->where('punch_time', '2026-05-03 08:30:00')
        ->count();

    expect($count)->toBe(1);
});

test('employee-not-found: unknown employeeCode is skipped and logged, command still succeeds', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/att/v1/transactions/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'list' => [
                    // This PIN has no matching employee.
                    ['employeeCode' => 'UNKNOWN999', 'checkTime' => '2026-05-03 08:30:00'],
                    // This one is valid and should still be stored.
                    ['employeeCode' => 'EMP400', 'checkTime' => '2026-05-03 08:31:00'],
                ],
            ],
        ], 200),
    ]);

    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(0);

    // Unknown PIN produces no record.
    expect(
        AttendanceRecord::query()
            ->whereNull('employee_id')
            ->count()
    )->toBe(0);

    // Valid PIN was stored.
    expect(
        AttendanceRecord::query()
            ->where('employee_id', 'EMP-400')
            ->where('punch_time', '2026-05-03 08:31:00')
            ->exists()
    )->toBeTrue();
});

test('empty API response: command succeeds and stores nothing', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/att/v1/transactions/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['currentPage' => 1, 'totalPages' => 1, 'list' => []],
        ], 200),
    ]);

    $before = AttendanceRecord::query()->count();

    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(0);

    expect(AttendanceRecord::query()->count())->toBe($before);
});

test('API error: command exits with failure code', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/att/v1/transactions/search' => Http::response('Server Error', 500),
    ]);

    $this->artisan('attendance:pull-zlink', [
        '--since' => '2026-05-03 08:00:00',
        '--until' => '2026-05-03 09:00:00',
    ])->assertExitCode(1);
});
