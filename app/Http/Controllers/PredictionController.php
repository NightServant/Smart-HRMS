<?php

namespace App\Http\Controllers;

use App\Models\HistoricalDataRecord;
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

        $records = HistoricalDataRecord::query()
            ->where('employee_name', $employeeName)
            ->orderBy('year')
            ->orderByRaw("CASE quarter WHEN 'Q1' THEN 1 WHEN 'Q2' THEN 2 WHEN 'Q3' THEN 3 WHEN 'Q4' THEN 4 ELSE 5 END")
            ->get()
            ->map(fn (HistoricalDataRecord $r): array => [
                'year' => $r->year,
                'quarter' => $r->quarter,
                'attendance_punctuality_rate' => (float) $r->attendance_punctuality_rate,
                'absenteeism_days' => $r->absenteeism_days,
                'tardiness_incidents' => $r->tardiness_incidents,
                'training_completion_status' => $r->training_completion_status,
                'evaluated_performance_score' => (float) $r->evaluated_performance_score,
            ])
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
