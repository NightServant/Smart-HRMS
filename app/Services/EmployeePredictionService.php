<?php

namespace App\Services;

use App\Models\Employee;

class EmployeePredictionService
{
    /**
     * @param  array<string, mixed>  $prediction
     */
    public function __construct(
        public PpeService $ppeService,
        public EmployeePerformanceHistoryService $historyService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Employee|string $employee): array
    {
        $history = $this->historyService->build($employee);
        $employeeName = $history['employee_name'];
        $records = $history['records'];

        if (count($records) === 0) {
            return $this->mergeHistoryPayload([
                'status' => 'error',
                'employee_name' => $employeeName,
                'notification' => "No historical data found for {$employeeName}.",
            ], $history);
        }

        $prediction = $this->ppeService->predict($employeeName, array_map(
            fn (array $record): array => [
                'year' => $record['year'],
                'period' => $record['period'],
                'attendance_punctuality_rate' => $record['attendance_punctuality_rate'],
                'absenteeism_days' => $record['absenteeism_days'],
                'tardiness_incidents' => $record['tardiness_incidents'],
                'training_completion_status' => $record['training_completion_status'],
                'evaluated_performance_score' => $record['evaluated_performance_score'],
            ],
            $records
        ));

        return $this->mergeHistoryPayload($prediction, $history);
    }

    /**
     * @param  array<string, mixed>  $prediction
     * @param  array{
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
     * }  $history
     * @return array<string, mixed>
     */
    private function mergeHistoryPayload(array $prediction, array $history): array
    {
        $records = $history['records'];
        $historicalLabels = array_map(
            fn (array $record): string => $record['year'].'-'.$record['period'],
            $records
        );
        $historicalScores = array_map(
            fn (array $record): float => round((float) $record['evaluated_performance_score'], 2),
            $records
        );
        $historicalYearly = collect($records)
            ->groupBy('year')
            ->map(fn ($yearRecords, $year): array => [
                'year' => (string) $year,
                'score' => round((float) collect($yearRecords)->avg('evaluated_performance_score'), 2),
            ])
            ->values();

        $prediction['employee_name'] = $history['employee_name'];
        $prediction['historical'] = array_merge($prediction['historical'] ?? [], [
            'labels' => $historicalLabels,
            'scores' => $historicalScores,
            'yearly_labels' => $historicalYearly->pluck('year')->all(),
            'yearly_scores' => $historicalYearly->pluck('score')->all(),
            'records' => $records,
        ]);
        $prediction['comparison'] = [
            'rows' => $history['comparison_rows'],
        ];
        $prediction['recent_avg'] = $prediction['recent_avg'] ?? $history['recent_avg'];
        $prediction['trend'] = $prediction['trend'] ?? $history['trend'];

        return $prediction;
    }
}
