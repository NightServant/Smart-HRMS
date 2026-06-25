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

        $pairs = $this->pairPunches($punches, $minGapMinutes);

        if ($pairs === []) {
            return;
        }

        $morningSeen = false;
        $afternoonSeen = false;
        $shiftIndex = 0;

        foreach ($pairs as $pair) {
            $shiftIndex++;
            $isMorning = $pair['time_in']->lessThan($cutoff);
            $isFirstInPeriod = $isMorning ? ! $morningSeen : ! $afternoonSeen;

            $lateMinutes = 0;
            if ($isFirstInPeriod) {
                $threshold = ($isMorning ? $morningStart : $afternoonStart)
                    ->copy()
                    ->addMinutes($lateThreshold);

                if ($pair['time_in']->greaterThan($threshold)) {
                    $lateMinutes = abs((int) $threshold->diffInMinutes($pair['time_in']));
                }
            }

            $status = match (true) {
                $pair['time_out'] === null => 'incomplete',
                $lateMinutes > 0 => 'late',
                default => 'on_time',
            };

            DailyAttendance::query()->insert([
                'employee_id' => $employeeId,
                'date' => $date->toDateString(),
                'shift_index' => $shiftIndex,
                'time_in' => $pair['time_in']->format('H:i:s'),
                'time_out' => $pair['time_out']?->format('H:i:s'),
                'status' => $status,
                'late_minutes' => $lateMinutes,
                'source' => $pair['source'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($isMorning) {
                $morningSeen = true;
            } else {
                $afternoonSeen = true;
            }
        }
    }

    /**
     * Walk punches chronologically and emit one (in, out) pair per shift.
     *
     * - punch_type '0' = check-in, '1' = check-out. With unknown/null
     *   punch_type the kind is inferred from the open/closed state of the
     *   current pair (alternating).
     * - A check-in arriving while another pair is still open closes the
     *   open one as incomplete and starts a new one — this is what makes
     *   a re-time-in after a time-out (or after a forgotten time-out)
     *   produce its own row instead of overriding the prior time-out.
     * - Same-type consecutive punches within $minGapMinutes are treated as
     *   double-tap noise and skipped.
     * - Orphan check-outs (no preceding check-in) are dropped.
     * - A closing punch within $minGapMinutes of its opener is treated as
     *   a duplicate tap and the time-out is dropped.
     *
     * @param  Collection<int, AttendanceRecord>  $punches
     * @return array<int, array{time_in: Carbon, time_out: ?Carbon, source: string}>
     */
    private function pairPunches(Collection $punches, int $minGapMinutes): array
    {
        $pairs = [];
        $open = null;
        $lastTime = null;
        $lastType = null;

        foreach ($punches as $punch) {
            $time = Carbon::parse($punch->punch_time);
            $type = $punch->punch_type;
            $known = $type === '0' || $type === '1' || $type === 0 || $type === 1;
            $isIn = $known ? ($type === '0' || $type === 0) : ($open === null);

            if ($lastTime !== null && $type === $lastType && abs((int) $time->diffInMinutes($lastTime)) < $minGapMinutes) {
                continue;
            }

            $lastTime = $time;
            $lastType = $type;

            if ($isIn) {
                if ($open !== null) {
                    $pairs[] = $this->finalizePair($open, null, null, $minGapMinutes);
                }

                $open = [
                    'time_in' => $time,
                    'sources' => array_filter([$punch->source]),
                ];

                continue;
            }

            if ($open === null) {
                continue;
            }

            $pairs[] = $this->finalizePair($open, $time, $punch->source, $minGapMinutes);
            $open = null;
        }

        if ($open !== null) {
            $pairs[] = $this->finalizePair($open, null, null, $minGapMinutes);
        }

        return $pairs;
    }

    /**
     * @param  array{time_in: Carbon, sources: array<int, string>}  $open
     * @return array{time_in: Carbon, time_out: ?Carbon, source: string}
     */
    private function finalizePair(array $open, ?Carbon $timeOut, ?string $outSource, int $minGapMinutes): array
    {
        if ($timeOut !== null && abs((int) $timeOut->diffInMinutes($open['time_in'])) < $minGapMinutes) {
            $timeOut = null;
            $outSource = null;
        }

        $sources = collect($open['sources'])
            ->push($outSource)
            ->filter()
            ->unique()
            ->values();

        $source = match (true) {
            $sources->count() > 1 => 'mixed',
            $sources->count() === 1 => (string) $sources->first(),
            default => (string) config('attendance.default_source', 'biometric'),
        };

        return [
            'time_in' => $open['time_in'],
            'time_out' => $timeOut,
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
