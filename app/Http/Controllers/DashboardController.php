<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\Seminars;
use App\Services\AtreService;
use App\Services\EmployeePredictionService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(AtreService $atre, EmployeePredictionService $predictionService): Response
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
        $prediction = $employee ? $predictionService->build($employee) : null;

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
