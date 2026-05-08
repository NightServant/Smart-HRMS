<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

class AttendanceAggregator
{
    public function recomputeForEmployeeDate(string $employeeId, CarbonImmutable $date): void
    {
        $punches = AttendanceRecord::query()
            ->where('employee_id', $employeeId)
            ->whereDate('date', $date->toDateString())
            ->orderBy('punch_time')
            ->get(['punch_time', 'source', 'punch_type']);

        if ($punches->isEmpty()) {
            DailyAttendance::query()
                ->where('employee_id', $employeeId)
                ->whereDate('date', $date->toDateString())
                ->delete();

            return;
        }

        $outPunches = $punches->where('punch_type', '1');

        if ($outPunches->isNotEmpty()) {
            $inPunches = $punches->where('punch_type', '0');

            $timeIn = $inPunches->isNotEmpty()
                ? Carbon::parse($inPunches->first()->punch_time)
                : Carbon::parse($punches->first()->punch_time);

            $timeOut = Carbon::parse($outPunches->last()->punch_time);
            $hasTimeOut = true;
        } else {
            $timeIn = Carbon::parse($punches->first()->punch_time);
            $timeOut = Carbon::parse($punches->last()->punch_time);

            $minGapMinutes = (int) config('attendance.time_out_min_gap_minutes', 60);
            $hasTimeOut = abs((int) $timeOut->diffInMinutes($timeIn)) >= $minGapMinutes;
        }

        $shiftStart = (string) config('attendance.shift_start', '09:00');
        $graceMinutes = (int) config('attendance.grace_period_minutes', 0);
        $shiftThreshold = Carbon::parse($date->toDateString().' '.$shiftStart)->addMinutes($graceMinutes);

        $lateMinutes = $timeIn->greaterThan($shiftThreshold)
            ? abs((int) $shiftThreshold->diffInMinutes($timeIn))
            : 0;

        if (! $hasTimeOut) {
            $status = 'incomplete';
        } else {
            $status = $lateMinutes > 0 ? 'late' : 'on_time';
        }

        $sources = $punches->pluck('source')->unique()->filter()->values();
        $source = match (true) {
            $sources->count() > 1 => 'mixed',
            $sources->count() === 1 => (string) $sources->first(),
            default => (string) config('attendance.default_source', 'biometric'),
        };

        DailyAttendance::query()->updateOrInsert(
            [
                'employee_id' => $employeeId,
                'date' => $date->toDateString(),
            ],
            [
                'time_in' => $timeIn->format('H:i:s'),
                'time_out' => $hasTimeOut ? $timeOut->format('H:i:s') : null,
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'source' => $source,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
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
