<?php

namespace App\Http\Controllers;

use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\Notification;
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
                ->latest()
                ->first();

            $recommendationsEnabled = $submission
                ? Notification::query()
                    ->where('user_id', auth()->id())
                    ->where('type', 'training_suggestion')
                    ->where('document_type', 'ipcr')
                    ->where('document_id', $submission->id)
                    ->exists()
                : false;

            if ($submission?->form_payload && $recommendationsEnabled) {
                $seminars = Seminars::query()
                    ->get()
                    ->map(fn (Seminars $s): array => [
                        'id' => $s->id,
                        'title' => $s->title,
                        'description' => $s->description,
                        'target_performance_area' => $s->target_performance_area,
                        'rating_tier' => $s->rating_tier,
                    ])
                    ->all();

                $result = $atre->recommend($seminars, $submission->form_payload);

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

            if (count($records) >= 4) {
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
