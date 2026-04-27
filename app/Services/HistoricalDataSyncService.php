<?php

namespace App\Services;

use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class HistoricalDataSyncService
{
    public function __construct() {}

    public function syncAll(): void
    {
        Employee::query()
            ->with(['department'])
            ->get()
            ->each(fn (Employee $employee): bool => $this->syncEmployee($employee));
    }

    public function syncEmployee(Employee $employee): bool
    {
        $attendanceByPeriod = $this->attendanceByPeriod($employee->employee_id);
        $synced = false;

        $submissions = IpcrSubmission::query()
            ->where('employee_id', $employee->employee_id)
            ->whereNotNull('final_rating')
            ->orderBy('finalized_at')
            ->orderBy('id')
            ->get();

        foreach ($submissions as $submission) {
            $periodReference = $this->resolveSubmissionPeriod($submission);

            if ($periodReference === null) {
                continue;
            }

            $attendance = $attendanceByPeriod->get(
                $this->periodKey($periodReference['year'], $periodReference['period']),
                $this->emptyAttendanceMetrics(),
            );

            HistoricalDataRecord::query()
                ->where('employee_name', $employee->name)
                ->where('year', $periodReference['year'])
                ->where('period', $periodReference['period'])
                ->delete();

            HistoricalDataRecord::query()->create([
                'employee_name' => $employee->name,
                'department_name' => $employee->department?->name ?? '',
                'year' => $periodReference['year'],
                'period' => $periodReference['period'],
                'quarter' => HistoricalDataRecord::resolveQuarterValue(null, $periodReference['period']) ?? 'Q1',
                'attendance_punctuality_rate' => $this->formatAttendanceRate($attendance['attendance_punctuality_rate']),
                'absenteeism_days' => $attendance['absenteeism_days'],
                'tardiness_incidents' => $attendance['tardiness_incidents'],
                'training_completion_status' => 0,
                'evaluated_performance_score' => round((float) $submission->final_rating, 2),
            ]);

            $synced = true;
        }

        return $synced;
    }

    /**
     * @return Collection<string, array{
     *     attendance_punctuality_rate: float,
     *     absenteeism_days: int,
     *     tardiness_incidents: int
     * }>
     */
    private function attendanceByPeriod(string $employeeId): Collection
    {
        return DailyAttendance::query()
            ->where('employee_id', $employeeId)
            ->orderBy('date')
            ->get()
            ->groupBy(function (DailyAttendance $attendance): string {
                $year = (int) $attendance->date?->format('Y');
                $period = (int) $attendance->date?->format('n') <= 6 ? 'S1' : 'S2';

                return $this->periodKey($year, $period);
            })
            ->map(function (Collection $records): array {
                $recordedDays = $records->count();
                $onTimeDays = $records->where('status', 'on_time')->count();
                $lateDays = $records->where('status', 'late')->count();
                $absentDays = $records->filter(function (DailyAttendance $attendance): bool {
                    return $attendance->status === 'absent'
                        || ($attendance->time_in === null && $attendance->time_out === null);
                })->count();

                $attendanceRate = $recordedDays > 0
                    ? round(($onTimeDays / $recordedDays) * 100, 2)
                    : 0.0;

                return [
                    'attendance_punctuality_rate' => $attendanceRate,
                    'absenteeism_days' => $absentDays,
                    'tardiness_incidents' => $lateDays,
                ];
            });
    }

    /**
     * @return array{year: int, period: string}|null
     */
    private function resolveSubmissionPeriod(IpcrSubmission $submission): ?array
    {
        $periodLabel = data_get($submission->form_payload, 'metadata.period');

        return $this->resolvePeriodReference(
            is_string($periodLabel) ? $periodLabel : null,
            $submission->finalized_at ?? $submission->created_at,
        );
    }

    /**
     * @return array{year: int, period: string}|null
     */
    private function resolvePeriodReference(?string $periodLabel, ?CarbonInterface $fallbackDate): ?array
    {
        $normalizedLabel = strtolower(trim((string) $periodLabel));
        preg_match('/(20\d{2})/', $normalizedLabel, $yearMatches);

        $year = isset($yearMatches[1])
            ? (int) $yearMatches[1]
            : $fallbackDate?->year;

        if ($year === null) {
            return null;
        }

        $isSecondSemester = $normalizedLabel !== ''
            ? str_contains($normalizedLabel, 'second')
                || str_contains($normalizedLabel, 'july')
                || str_contains($normalizedLabel, 'december')
                || str_contains($normalizedLabel, 's2')
            : (($fallbackDate?->month ?? 1) > 6);

        return [
            'year' => $year,
            'period' => $isSecondSemester ? 'S2' : 'S1',
        ];
    }

    /**
     * @return array{
     *     attendance_punctuality_rate: float,
     *     absenteeism_days: int,
     *     tardiness_incidents: int
     * }
     */
    private function emptyAttendanceMetrics(): array
    {
        return [
            'attendance_punctuality_rate' => 0.0,
            'absenteeism_days' => 0,
            'tardiness_incidents' => 0,
        ];
    }

    private function formatAttendanceRate(float $rate): string
    {
        $formatted = rtrim(rtrim(number_format($rate, 2, '.', ''), '0'), '.');

        return $formatted.'%';
    }

    private function periodKey(int $year, string $period): string
    {
        return $year.'-'.$period;
    }
}
