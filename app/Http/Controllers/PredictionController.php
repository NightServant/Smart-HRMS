<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\User;
use App\Services\PpeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PredictionController extends Controller
{
    public function predict(Request $request, PpeService $service): JsonResponse
    {
        $request->validate([
            'employee_name' => 'required|string|max:255',
        ]);

        $employeeName = $request->string('employee_name')->toString();
        $user = $request->user();

        if ($user->hasRole(User::ROLE_EMPLOYEE)) {
            $employee = Employee::query()->find($user->employee_id);
            abort_unless($employee && $employee->name === $employeeName, 403);
        }

        $records = HistoricalDataRecord::query()
            ->where('employee_name', $employeeName)
            ->orderBy('year')
            ->get()
            ->map(function (HistoricalDataRecord $record): ?array {
                $period = $record->resolvedPeriod();
                $score = $record->normalizedEvaluatedPerformanceScore();

                if ($period === null || $score === null) {
                    return null;
                }

                return [
                    'year' => $record->year,
                    'period' => $period,
                    'attendance_punctuality_rate' => (float) $record->attendance_punctuality_rate,
                    'absenteeism_days' => $record->absenteeism_days,
                    'tardiness_incidents' => $record->tardiness_incidents,
                    'training_completion_status' => $record->training_completion_status,
                    'evaluated_performance_score' => $score,
                ];
            })
            ->filter()
            ->sortBy([
                ['year', 'asc'],
                ['period', 'asc'],
            ])
            ->values()
            ->all();

        if (count($records) === 0) {
            return response()->json([
                'status' => 'error',
                'notification' => "No historical data found for {$employeeName}.",
            ]);
        }

        $result = $service->predict($employeeName, $records);

        return response()->json($result);
    }
}
