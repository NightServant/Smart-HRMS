<?php

namespace App\Services;

use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class EmployeePerformanceHistoryService
{
    public function __construct(
        public HistoricalDataSyncService $historicalDataSyncService,
    ) {}

    /**
     * @return array{
     *     employee: \App\Models\Employee|null,
     *     employee_name: string,
     *     records: array<int, array{
     *         year: int,
     *         period: string,
     *         attendance_punctuality_rate: float,
     *         absenteeism_days: int,
     *         tardiness_incidents: int,
     *         training_completion_status: int,
     *         evaluated_performance_score: float,
     *         source: string
     *     }>,
     *     comparison_rows: array<int, array<string, mixed>>,
     *     recent_avg: float|null,
     *     trend: string
     * }
     */
    public function build(Employee|string $employee): array
    {
        $employeeModel = is_string($employee)
            ? Employee::query()->where('name', $employee)->first()
            : $employee;

        $employeeName = $employeeModel?->name ?? (string) $employee;
        if ($employeeModel instanceof Employee) {
            $this->historicalDataSyncService->syncEmployee($employeeModel);
        }

        $livePayload = $employeeModel instanceof Employee
            ? $this->liveRecords($employeeModel)
            : ['records' => collect(), 'comparison_rows' => collect()];
        $records = $this->storedRecords($employeeName, $livePayload['records']);

        $sortedRecords = $records
            ->sortBy([
                fn (array $record): int => $record['year'],
                fn (array $record): int => $record['period'] === 'S1' ? 1 : 2,
            ])
            ->values();

        $recentAvg = $sortedRecords->isEmpty()
            ? null
            : round((float) $sortedRecords->take(-4)->avg('evaluated_performance_score'), 2);

        return [
            'employee' => $employeeModel,
            'employee_name' => $employeeName,
            'records' => $sortedRecords->all(),
            'comparison_rows' => $livePayload['comparison_rows']
                ->sortBy([
                    fn (array $row): int => (int) $row['year'],
                    fn (array $row): int => $row['period'] === 'S1' ? 1 : 2,
                ])
                ->values()
                ->all(),
            'recent_avg' => $recentAvg,
            'trend' => $this->resolveHistoricalTrend($sortedRecords),
        ];
    }

    /**
     * @return Collection<string, array{
     *     year: int,
     *     period: string,
     *     attendance_punctuality_rate: float,
     *     absenteeism_days: int,
     *     tardiness_incidents: int,
     *     training_completion_status: int,
     *     evaluated_performance_score: float,
     *     source: string
     * }>
     */
    private function storedRecords(string $employeeName, Collection $liveRecords): Collection
    {
        return HistoricalDataRecord::query()
            ->where('employee_name', $employeeName)
            ->orderBy('year')
            ->get()
            ->mapWithKeys(function (HistoricalDataRecord $record) use ($liveRecords): array {
                $period = $record->resolvedPeriod();
                $score = $record->normalizedEvaluatedPerformanceScore();

                if ($period === null || $score === null) {
                    return [];
                }

                $key = $this->periodKey($record->year, $period);

                return [
                    $key => [
                        'year' => $record->year,
                        'period' => $period,
                        'attendance_punctuality_rate' => (float) preg_replace('/[^0-9.]/', '', (string) $record->attendance_punctuality_rate),
                        'absenteeism_days' => (int) $record->absenteeism_days,
                        'tardiness_incidents' => (int) $record->tardiness_incidents,
                        'training_completion_status' => (int) $record->training_completion_status,
                        'evaluated_performance_score' => $score,
                        'source' => $liveRecords->has($key) ? 'live' : 'csv',
                    ],
                ];
            });
    }

    /**
     * @return array{
     *     records: Collection<string, array{
     *         year: int,
     *         period: string,
     *         attendance_punctuality_rate: float,
     *         absenteeism_days: int,
     *         tardiness_incidents: int,
     *         training_completion_status: int,
     *         evaluated_performance_score: float,
     *         source: string
     *     }>,
     *     comparison_rows: Collection<int, array<string, mixed>>
     * }
     */
    private function liveRecords(Employee $employee): array
    {
        $targets = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->get()
            ->keyBy(fn (IpcrTarget $target): string => $this->periodKey($target->target_year, 'S'.$target->semester));
        $attendanceByPeriod = $this->attendanceByPeriod($employee->employee_id);
        $liveRecords = collect();
        $comparisonRows = collect();

        $submissions = IpcrSubmission::query()
            ->where('employee_id', $employee->employee_id)
            ->whereNotNull('final_rating')
            ->orderBy('finalized_at')
            ->orderBy('id')
            ->get();

        $processedKeys = [];

        foreach ($submissions as $submission) {
            $periodReference = $this->resolveSubmissionPeriod($submission);

            if ($periodReference === null) {
                continue;
            }

            $key = $this->periodKey($periodReference['year'], $periodReference['period']);
            $attendance = $attendanceByPeriod->get($key, $this->emptyAttendanceMetrics());
            $score = round((float) $submission->final_rating, 2);
            $target = $targets->get($key);
            $targetItems = $this->collectPayloadItems($target?->form_payload, 'accountable');
            $actualItems = $this->collectPayloadItems($submission->form_payload, 'actual_accomplishment');
            $achievement = $this->scoreBand($score);

            $liveRecords->put($key, [
                'year' => $periodReference['year'],
                'period' => $periodReference['period'],
                'attendance_punctuality_rate' => $attendance['attendance_punctuality_rate'],
                'absenteeism_days' => $attendance['absenteeism_days'],
                'tardiness_incidents' => $attendance['tardiness_incidents'],
                'training_completion_status' => 0,
                'evaluated_performance_score' => $score,
                'source' => 'live',
            ]);

            $comparisonRows->push([
                'year' => $periodReference['year'],
                'period' => $periodReference['period'],
                'evaluation_score' => $score,
                'target_score' => $target !== null ? 4.00 : null,
                'achievement_status' => $achievement['status'],
                'achievement_label' => $achievement['label'],
                'target_items' => $targetItems,
                'target_summary' => $this->summarizeItems($targetItems),
                'actual_items' => $actualItems,
                'actual_summary' => $this->summarizeItems($actualItems),
                'attendance_punctuality_rate' => $attendance['attendance_punctuality_rate'],
                'tardiness_incidents' => $attendance['tardiness_incidents'],
                'on_time_days' => $attendance['on_time_days'],
                'late_days' => $attendance['late_days'],
                'incomplete_days' => $attendance['incomplete_days'],
                'complete_days' => $attendance['complete_days'],
                'recorded_days' => $attendance['recorded_days'],
                'source' => 'live',
            ]);

            $processedKeys[$key] = true;
        }

        foreach ($targets as $key => $target) {
            if (isset($processedKeys[$key])) {
                continue;
            }

            if ($target->evaluator_decision !== 'approved') {
                continue;
            }

            $period = 'S'.$target->semester;
            $attendance = $attendanceByPeriod->get($key, $this->emptyAttendanceMetrics());
            $targetItems = $this->collectPayloadItems($target->form_payload, 'accountable');

            $comparisonRows->push([
                'year' => $target->target_year,
                'period' => $period,
                'evaluation_score' => null,
                'target_score' => 4.00,
                'achievement_status' => 'pending',
                'achievement_label' => 'Pending Evaluation',
                'target_items' => $targetItems,
                'target_summary' => $this->summarizeItems($targetItems),
                'actual_items' => [],
                'actual_summary' => null,
                'attendance_punctuality_rate' => $attendance['attendance_punctuality_rate'],
                'tardiness_incidents' => $attendance['tardiness_incidents'],
                'on_time_days' => $attendance['on_time_days'],
                'late_days' => $attendance['late_days'],
                'incomplete_days' => $attendance['incomplete_days'],
                'complete_days' => $attendance['complete_days'],
                'recorded_days' => $attendance['recorded_days'],
                'source' => 'upcoming',
            ]);
        }

        return [
            'records' => $liveRecords,
            'comparison_rows' => $comparisonRows,
        ];
    }

    /**
     * @return Collection<string, array{
     *     attendance_punctuality_rate: float,
     *     absenteeism_days: int,
     *     tardiness_incidents: int,
     *     on_time_days: int,
     *     late_days: int,
     *     incomplete_days: int,
     *     complete_days: int,
     *     recorded_days: int
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
                $semester = (int) $attendance->date?->format('n') <= 6 ? 'S1' : 'S2';

                return $this->periodKey($year, $semester);
            })
            ->map(function (Collection $records): array {
                $recordedDays = $records->count();
                $onTimeDays = $records->where('status', 'on_time')->count();
                $lateDays = $records->where('status', 'late')->count();
                $incompleteDays = $records->where('status', 'incomplete')->count();
                $absentDays = $records->filter(
                    fn (DailyAttendance $attendance): bool => $attendance->status === 'absent'
                        || ($attendance->time_in === null && $attendance->time_out === null)
                )->count();
                $completeDays = $records->filter(
                    fn (DailyAttendance $attendance): bool => $attendance->time_in !== null && $attendance->time_out !== null
                )->count();
                $attendanceRate = $recordedDays > 0
                    ? round(($onTimeDays / $recordedDays) * 100, 2)
                    : 0.0;

                return [
                    'attendance_punctuality_rate' => $attendanceRate,
                    'absenteeism_days' => $absentDays,
                    'tardiness_incidents' => $lateDays,
                    'on_time_days' => $onTimeDays,
                    'late_days' => $lateDays,
                    'incomplete_days' => $incompleteDays,
                    'complete_days' => $completeDays,
                    'recorded_days' => $recordedDays,
                ];
            });
    }

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
     * @param  array<string, mixed>|null  $payload
     * @return list<string>
     */
    private function collectPayloadItems(?array $payload, string $field): array
    {
        return collect($payload['sections'] ?? [])
            ->flatMap(fn (array $section): array => $section['rows'] ?? [])
            ->map(fn (array $row): string => trim((string) ($row[$field] ?? '')))
            ->filter(fn (string $value): bool => $value !== '')
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $items
     */
    private function summarizeItems(array $items): ?string
    {
        if ($items === []) {
            return null;
        }

        $visibleItems = array_slice($items, 0, 2);
        $summary = implode('; ', $visibleItems);

        if (count($items) > 2) {
            $summary .= ' +'.(count($items) - 2).' more';
        }

        return $summary;
    }

    /**
     * @param  Collection<int, array{evaluated_performance_score: float}>  $records
     */
    private function resolveHistoricalTrend(Collection $records): string
    {
        if ($records->count() < 2) {
            return 'STABLE';
        }

        $recentAvg = (float) $records->take(-2)->avg('evaluated_performance_score');
        $previousRecords = $records->slice(max(0, $records->count() - 4), 2);
        $previousAvg = $previousRecords->isEmpty()
            ? (float) $records->first()['evaluated_performance_score']
            : (float) $previousRecords->avg('evaluated_performance_score');
        $delta = round($recentAvg - $previousAvg, 2);

        if ($delta > 0.1) {
            return 'IMPROVING';
        }

        if ($delta < -0.1) {
            return 'DECLINING';
        }

        return 'STABLE';
    }

    /**
     * @return array{status: string, label: string}
     */
    private function scoreBand(float $score): array
    {
        if ($score < 3.0) {
            return [
                'status' => 'needs_improvement',
                'label' => 'Needs Improvement',
            ];
        }

        if ($score < 3.75) {
            return [
                'status' => 'on_track',
                'label' => 'On Track',
            ];
        }

        return [
            'status' => 'strongly_achieved',
            'label' => 'Strongly Achieved',
        ];
    }

    /**
     * @return array{
     *     attendance_punctuality_rate: float,
     *     absenteeism_days: int,
     *     tardiness_incidents: int,
     *     on_time_days: int,
     *     late_days: int,
     *     incomplete_days: int,
     *     complete_days: int,
     *     recorded_days: int
     * }
     */
    private function emptyAttendanceMetrics(): array
    {
        return [
            'attendance_punctuality_rate' => 0.0,
            'absenteeism_days' => 0,
            'tardiness_incidents' => 0,
            'on_time_days' => 0,
            'late_days' => 0,
            'incomplete_days' => 0,
            'complete_days' => 0,
            'recorded_days' => 0,
        ];
    }

    private function periodKey(int $year, string $period): string
    {
        return $year.'-'.$period;
    }
}
