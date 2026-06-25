<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\Notification;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $employee = auth()->user()->employee;

        $latestSubmission = $employee
            ? IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->latest()
                ->first()
            : null;

        $recommendationsEnabled = $latestSubmission
            ? Notification::query()
                ->where('user_id', auth()->id())
                ->whereIn('type', ['training_suggestion', 'training_suggestion_global'])
                ->where(function ($query) use ($latestSubmission): void {
                    $query
                        ->where(function ($q) use ($latestSubmission): void {
                            $q->where('type', 'training_suggestion')
                                ->where('document_type', 'ipcr')
                                ->where('document_id', $latestSubmission->id);
                        })
                        ->orWhere('type', 'training_suggestion_global');
                })
                ->exists()
            : false;

        return Inertia::render('dashboard', [
            'recommendationsEnabled' => $recommendationsEnabled,
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
