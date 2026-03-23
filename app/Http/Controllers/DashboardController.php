<?php

namespace App\Http\Controllers;

use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\Seminars;
use App\Services\AtreService;
use App\Services\PpeService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(AtreService $atre, PpeService $ppe): Response
    {
        $employee = auth()->user()->employee;

        $recommendations = [];
        $riskLevel = 'NONE';
        $weakAreas = [];

        if ($employee) {
            $submission = IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->whereNotNull('criteria_ratings')
                ->latest()
                ->first();

            if ($submission?->criteria_ratings) {
                $seminars = Seminars::query()
                    ->orderBy('date')
                    ->get()
                    ->map(fn (Seminars $s): array => [
                        'id' => $s->id,
                        'title' => $s->title,
                        'description' => $s->description,
                        'location' => $s->location,
                        'time' => $s->time,
                        'speaker' => $s->speaker,
                        'target_performance_area' => $s->target_performance_area,
                        'date' => $s->date?->format('Y-m-d'),
                    ])
                    ->all();

                $result = $atre->recommend($seminars, $submission->criteria_ratings);

                $recommendations = $result['recommendations'] ?? [];
                $riskLevel = $result['risk_level'] ?? 'LOW';
                $weakAreas = $result['weak_areas'] ?? [];
            }
        }

        $latestSubmission = $employee
            ? IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->latest()
                ->first()
            : null;

        // PPE: Predictive Performance Evaluation via Linear Regression
        $prediction = null;
        if ($employee) {
            $records = HistoricalDataRecord::query()
                ->where('employee_name', $employee->name)
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

            if (count($records) >= 8) {
                $prediction = $ppe->predict($employee->name, $records);
            }
        }

        return Inertia::render('dashboard', [
            'recommendations' => $recommendations,
            'riskLevel' => $riskLevel,
            'weakAreas' => $weakAreas,
            'employeeProfile' => $employee ? [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'job_title' => $employee->job_title,
                'performance_rating' => $latestSubmission?->performance_rating,
                'remarks' => $latestSubmission?->rejection_reason,
                'notification' => $latestSubmission?->notification,
            ] : null,
            'prediction' => $prediction,
        ]);
    }
}
