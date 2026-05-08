<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class AttendanceAggregator
{
    public function recomputeForEmployeeDate(string $employeeId, CarbonImmutable $date): void
    {
        $punches = AttendanceRecord::query()
            ->where('employee_id', $employeeId)
            ->whereDate('date', $date->toDateString())
            ->orderBy('punch_time')
            ->get(['punch_time', 'source', 'punch_type']);

        DailyAttendance::query()
            ->where('employee_id', $employeeId)
            ->whereDate('date', $date->toDateString())
            ->delete();

        if ($punches->isEmpty()) {
            return;
        }

        $morningStart = $this->parseTimeOnDate($date, $this->setting('morning_start', (string) config('attendance.shift_start', '08:00')));
        $morningEnd = $this->parseTimeOnDate($date, $this->setting('morning_end', '12:00'));
        $afternoonStart = $this->parseTimeOnDate($date, $this->setting('afternoon_start', '13:00'));

        $cutoff = Carbon::createFromTimestamp(
            (int) round(($morningEnd->getTimestamp() + $afternoonStart->getTimestamp()) / 2),
            $morningEnd->getTimezone(),
        );

        $lateThreshold = (int) ($this->setting('late_threshold_minutes', (string) config('attendance.grace_period_minutes', 15)));
        $minGapMinutes = (int) config('attendance.time_out_min_gap_minutes', 1);

        [$morningPunches, $afternoonPunches] = $punches->partition(
            fn ($punch) => Carbon::parse($punch->punch_time)->lessThan($cutoff),
        );

        $rows = [];

        if ($morningPunches->isNotEmpty()) {
            $rows[] = $this->buildPeriodRow($morningPunches, $morningStart, $lateThreshold, $minGapMinutes, 1);
        }

        if ($afternoonPunches->isNotEmpty()) {
            $rows[] = $this->buildPeriodRow($afternoonPunches, $afternoonStart, $lateThreshold, $minGapMinutes, 2);
        }

        foreach ($rows as $row) {
            DailyAttendance::query()->insert([
                'employee_id' => $employeeId,
                'date' => $date->toDateString(),
                'shift_index' => $row['shift_index'],
                'time_in' => $row['time_in'],
                'time_out' => $row['time_out'],
                'status' => $row['status'],
                'late_minutes' => $row['late_minutes'],
                'source' => $row['source'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @param  Collection<int, AttendanceRecord>  $punches
     * @return array{shift_index: int, time_in: string, time_out: ?string, status: string, late_minutes: int, source: string}
     */
    private function buildPeriodRow(Collection $punches, Carbon $periodStart, int $lateThreshold, int $minGapMinutes, int $shiftIndex): array
    {
        $first = $punches->first();
        $last = $punches->last();

        $timeIn = Carbon::parse($first->punch_time);
        $hasOut = $first !== $last;
        $timeOut = $hasOut ? Carbon::parse($last->punch_time) : null;

        if ($hasOut) {
            $gap = abs((int) $timeOut->diffInMinutes($timeIn));

            if ($gap < $minGapMinutes) {
                $hasOut = false;
                $timeOut = null;
            }
        }

        $threshold = $periodStart->copy()->addMinutes($lateThreshold);
        $lateMinutes = $timeIn->greaterThan($threshold)
            ? abs((int) $threshold->diffInMinutes($timeIn))
            : 0;

        $status = match (true) {
            ! $hasOut => 'incomplete',
            $lateMinutes > 0 => 'late',
            default => 'on_time',
        };

        $sources = collect([$first->source, $hasOut ? $last->source : null])
            ->filter()
            ->unique()
            ->values();

        $source = match (true) {
            $sources->count() > 1 => 'mixed',
            $sources->count() === 1 => (string) $sources->first(),
            default => (string) config('attendance.default_source', 'biometric'),
        };

        return [
            'shift_index' => $shiftIndex,
            'time_in' => $timeIn->format('H:i:s'),
            'time_out' => $hasOut ? $timeOut->format('H:i:s') : null,
            'status' => $status,
            'late_minutes' => $lateMinutes,
            'source' => $source,
        ];
    }

    private function setting(string $key, string $default): string
    {
        $value = SystemSetting::get($key, $default);

        return $value === null || $value === '' ? $default : (string) $value;
    }

    private function parseTimeOnDate(CarbonImmutable $date, string $hms): Carbon
    {
        return Carbon::parse($date->toDateString().' '.$hms);
    }

    /**
     * @param  array<int, array{employee_id: string, date: string|CarbonImmutable}>  $tuples
     */
    public function recomputeBatch(array $tuples): void
    {
        $seen = [];

        foreach ($tuples as $tuple) {
            $employeeId = (string) $tuple['employee_id'];
            $date = $tuple['date'] instanceof CarbonImmutable
                ? $tuple['date']
                : CarbonImmutable::parse((string) $tuple['date']);

            $key = $employeeId.'|'.$date->toDateString();

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $this->recomputeForEmployeeDate($employeeId, $date);
        }
    }
}
