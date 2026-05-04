<?php

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use Carbon\CarbonImmutable;

beforeEach(function () {
    config([
        'attendance.shift_start' => '08:00',
        'attendance.grace_period_minutes' => 0,
        'attendance.time_out_min_gap_minutes' => 60,
    ]);

    Employee::query()->create([
        'employee_id' => 'AGG-001',
        'name' => 'Agg Tester',
        'job_title' => 'QA',
    ]);
});

function seedPunch(string $employeeId, string $datetime, string $source = 'biometric'): void
{
    AttendanceRecord::query()->create([
        'employee_id' => $employeeId,
        'date' => substr($datetime, 0, 10),
        'punch_time' => $datetime,
        'status' => null,
        'source' => $source,
    ]);
}

test('single punch yields incomplete status with no time_out', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row)->not->toBeNull();
    expect($row->status)->toBe('incomplete');
    expect($row->time_in)->toBe('07:30:00');
    expect($row->time_out)->toBeNull();
    expect($row->late_minutes)->toBe(0);
    expect($row->source)->toBe('biometric');
});

test('on-time first punch with later time-out yields on_time status', function () {
    seedPunch('AGG-001', '2026-04-26 07:45:00');
    seedPunch('AGG-001', '2026-04-26 17:30:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row->status)->toBe('on_time');
    expect($row->time_in)->toBe('07:45:00');
    expect($row->time_out)->toBe('17:30:00');
    expect($row->late_minutes)->toBe(0);
});

test('late first punch flags late status with positive late_minutes', function () {
    seedPunch('AGG-001', '2026-04-26 08:45:00');
    seedPunch('AGG-001', '2026-04-26 18:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row->status)->toBe('late');
    expect($row->late_minutes)->toBe(45);
});

test('grace period buffers late detection at the boundary', function () {
    config(['attendance.grace_period_minutes' => 15]);

    seedPunch('AGG-001', '2026-04-26 08:14:00');
    seedPunch('AGG-001', '2026-04-26 17:30:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row->status)->toBe('on_time');
    expect($row->late_minutes)->toBe(0);
});

test('mixed manual and biometric sources produce mixed source label', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00', 'biometric');
    seedPunch('AGG-001', '2026-04-26 17:00:00', 'manual');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row->source)->toBe('mixed');
    expect($row->status)->toBe('on_time');
});

test('two punches within the min gap window are treated as incomplete', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00');
    seedPunch('AGG-001', '2026-04-26 08:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26']);

    expect($row->status)->toBe('incomplete');
    expect($row->time_out)->toBeNull();
    expect($row->time_in)->toBe('07:30:00');
});
