<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\Seminars;
use App\Services\AtreService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(AtreService $atre): Response
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
        ]);
    }
}
