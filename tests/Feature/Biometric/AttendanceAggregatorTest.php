<?php

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Models\SystemSetting;
use App\Services\Biometric\AttendanceAggregator;
use Carbon\CarbonImmutable;

beforeEach(function () {
    config([
        'attendance.shift_start' => '08:00',
        'attendance.grace_period_minutes' => 15,
        'attendance.time_out_min_gap_minutes' => 1,
    ]);

    SystemSetting::query()->delete();

    $defaults = [
        ['key' => 'morning_start', 'value' => '08:00', 'type' => 'time', 'group' => 'attendance', 'label' => 'Morning Start'],
        ['key' => 'morning_end', 'value' => '12:00', 'type' => 'time', 'group' => 'attendance', 'label' => 'Morning End'],
        ['key' => 'afternoon_start', 'value' => '13:00', 'type' => 'time', 'group' => 'attendance', 'label' => 'Afternoon Start'],
        ['key' => 'afternoon_end', 'value' => '17:00', 'type' => 'time', 'group' => 'attendance', 'label' => 'Afternoon End'],
        ['key' => 'late_threshold_minutes', 'value' => '15', 'type' => 'integer', 'group' => 'attendance', 'label' => 'Late Threshold'],
    ];

    foreach ($defaults as $row) {
        SystemSetting::query()->create($row);
    }

    cache()->flush();

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

test('single morning punch produces one incomplete morning row', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows)->toHaveCount(1);
    expect($rows[0]->shift_index)->toBe(1);
    expect($rows[0]->time_in)->toBe('07:30:00');
    expect($rows[0]->time_out)->toBeNull();
    expect($rows[0]->status)->toBe('incomplete');
});

test('full day with morning and afternoon punches produces two complete rows', function () {
    seedPunch('AGG-001', '2026-04-26 07:55:00');
    seedPunch('AGG-001', '2026-04-26 12:05:00');
    seedPunch('AGG-001', '2026-04-26 12:55:00');
    seedPunch('AGG-001', '2026-04-26 17:10:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows)->toHaveCount(2);

    expect($rows[0]->shift_index)->toBe(1);
    expect($rows[0]->time_in)->toBe('07:55:00');
    expect($rows[0]->time_out)->toBe('12:05:00');
    expect($rows[0]->status)->toBe('on_time');

    expect($rows[1]->shift_index)->toBe(2);
    expect($rows[1]->time_in)->toBe('12:55:00');
    expect($rows[1]->time_out)->toBe('17:10:00');
    expect($rows[1]->status)->toBe('on_time');
});

test('late morning clock-in is flagged on the morning row only', function () {
    seedPunch('AGG-001', '2026-04-26 08:30:00');
    seedPunch('AGG-001', '2026-04-26 12:00:00');
    seedPunch('AGG-001', '2026-04-26 13:00:00');
    seedPunch('AGG-001', '2026-04-26 17:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows[0]->status)->toBe('late');
    expect($rows[0]->late_minutes)->toBe(15);
    expect($rows[1]->status)->toBe('on_time');
    expect($rows[1]->late_minutes)->toBe(0);
});

test('late threshold buffers period start', function () {
    seedPunch('AGG-001', '2026-04-26 08:14:00');
    seedPunch('AGG-001', '2026-04-26 12:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26', 'shift_index' => 1]);

    expect($row->status)->toBe('on_time');
    expect($row->late_minutes)->toBe(0);
});

test('two punches within min gap collapse to incomplete', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00');
    seedPunch('AGG-001', '2026-04-26 07:30:30');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26', 'shift_index' => 1]);

    expect($row->status)->toBe('incomplete');
    expect($row->time_in)->toBe('07:30:00');
    expect($row->time_out)->toBeNull();
});

test('mixed sources within a period produce mixed source label', function () {
    seedPunch('AGG-001', '2026-04-26 07:30:00', 'biometric');
    seedPunch('AGG-001', '2026-04-26 11:55:00', 'manual');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $row = DailyAttendance::query()->firstWhere(['employee_id' => 'AGG-001', 'date' => '2026-04-26', 'shift_index' => 1]);

    expect($row->source)->toBe('mixed');
});

test('only afternoon punches produce one row with late status when after threshold', function () {
    seedPunch('AGG-001', '2026-04-26 13:30:00');
    seedPunch('AGG-001', '2026-04-26 17:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->get();

    expect($rows)->toHaveCount(1);
    expect($rows[0]->shift_index)->toBe(1);
    expect($rows[0]->status)->toBe('late');
    expect($rows[0]->time_in)->toBe('13:30:00');
    expect($rows[0]->time_out)->toBe('17:00:00');
});

test('re-time-in after a time-out within the same period produces a new row', function () {
    seedPunch('AGG-001', '2026-04-26 08:00:00');
    seedPunch('AGG-001', '2026-04-26 09:00:00');
    seedPunch('AGG-001', '2026-04-26 09:30:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows)->toHaveCount(2);

    expect($rows[0]->shift_index)->toBe(1);
    expect($rows[0]->time_in)->toBe('08:00:00');
    expect($rows[0]->time_out)->toBe('09:00:00');
    expect($rows[0]->status)->toBe('on_time');

    expect($rows[1]->shift_index)->toBe(2);
    expect($rows[1]->time_in)->toBe('09:30:00');
    expect($rows[1]->time_out)->toBeNull();
    expect($rows[1]->status)->toBe('incomplete');
    expect($rows[1]->late_minutes)->toBe(0);
});

test('three full pairs in one day produce three rows with sequential shift_index', function () {
    seedPunch('AGG-001', '2026-04-26 08:00:00');
    seedPunch('AGG-001', '2026-04-26 12:00:00');
    seedPunch('AGG-001', '2026-04-26 13:00:00');
    seedPunch('AGG-001', '2026-04-26 17:00:00');
    seedPunch('AGG-001', '2026-04-26 18:00:00');
    seedPunch('AGG-001', '2026-04-26 20:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows)->toHaveCount(3);
    expect($rows->pluck('shift_index')->all())->toBe([1, 2, 3]);
    expect($rows[2]->time_in)->toBe('18:00:00');
    expect($rows[2]->time_out)->toBe('20:00:00');
});

test('recompute is idempotent and replaces previous rows', function () {
    seedPunch('AGG-001', '2026-04-26 08:00:00');
    seedPunch('AGG-001', '2026-04-26 12:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));
    expect(DailyAttendance::query()->where('employee_id', 'AGG-001')->count())->toBe(1);

    seedPunch('AGG-001', '2026-04-26 13:00:00');
    seedPunch('AGG-001', '2026-04-26 17:00:00');

    app(AttendanceAggregator::class)->recomputeForEmployeeDate('AGG-001', CarbonImmutable::parse('2026-04-26'));

    $rows = DailyAttendance::query()
        ->where(['employee_id' => 'AGG-001', 'date' => '2026-04-26'])
        ->orderBy('shift_index')
        ->get();

    expect($rows)->toHaveCount(2);
    expect($rows[0]->time_in)->toBe('08:00:00');
    expect($rows[0]->time_out)->toBe('12:00:00');
    expect($rows[1]->time_in)->toBe('13:00:00');
    expect($rows[1]->time_out)->toBe('17:00:00');
});
