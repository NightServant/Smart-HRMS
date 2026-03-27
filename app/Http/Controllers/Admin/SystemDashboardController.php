<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Seminars;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SystemDashboardController extends Controller
{
    public function index(): Response
    {
        $users = User::query();
        $leaveRequests = LeaveRequest::query();
        $ipcrSubmissions = IpcrSubmission::query();
        $auditLogs = IwrAuditLog::query();

        $accountMetrics = [
            'total' => (clone $users)->count(),
            'active' => (clone $users)->where('is_active', true)->count(),
            'inactive' => (clone $users)->where('is_active', false)->count(),
            'twoFactorEnabled' => (clone $users)->whereNotNull('two_factor_confirmed_at')->count(),
            'byRole' => [
                'administrators' => (clone $users)->where('role', User::ROLE_ADMINISTRATOR)->count(),
                'hrPersonnel' => (clone $users)->where('role', User::ROLE_HR_PERSONNEL)->count(),
                'evaluators' => (clone $users)->where('role', User::ROLE_EVALUATOR)->count(),
                'employees' => (clone $users)->where('role', User::ROLE_EMPLOYEE)->count(),
            ],
        ];

        $workflowMetrics = [
            'leave' => [
                'total' => (clone $leaveRequests)->count(),
                'routed' => (clone $leaveRequests)->where('status', 'routed')->count(),
                'completed' => (clone $leaveRequests)->where('status', 'completed')->count(),
                'returned' => (clone $leaveRequests)->where('status', 'returned')->count(),
                'pendingReason' => (clone $leaveRequests)->where('stage', 'rejection_reason_pending')->count(),
            ],
            'ipcr' => [
                'total' => (clone $ipcrSubmissions)->count(),
                'routed' => (clone $ipcrSubmissions)->where('status', 'routed')->count(),
                'completed' => (clone $ipcrSubmissions)->where('status', 'completed')->count(),
                'returned' => (clone $ipcrSubmissions)->where('status', 'returned')->count(),
                'pendingEvaluation' => (clone $ipcrSubmissions)->where('stage', 'waiting_for_remarks')->count(),
            ],
        ];

        $averageConfidence = (float) ((clone $auditLogs)->avg('confidence_pct') ?? 0);

        $auditMetrics = [
            'totalEvents' => (clone $auditLogs)->count(),
            'leaveEvents' => (clone $auditLogs)->where('document_type', 'leave')->count(),
            'ipcrEvents' => (clone $auditLogs)->where('document_type', 'ipcr')->count(),
            'averageConfidence' => round($averageConfidence, 2),
            'lowConfidenceCount' => (clone $auditLogs)->where('confidence_pct', '<', 60)->count(),
            'failedComplianceCount' => (clone $auditLogs)->where('compliance_passed', false)->count(),
            'routingActions' => IwrAuditLog::query()
                ->select('routing_action', DB::raw('count(*) as total'))
                ->groupBy('routing_action')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn (IwrAuditLog $log): array => [
                    'action' => $log->routing_action ?? 'unknown',
                    'total' => (int) $log->total,
                ])
                ->all(),
        ];

        $trainingMetrics = [
            'scheduledCount' => Seminars::query()->count(),
            'targetAreas' => Seminars::query()
                ->select('target_performance_area', DB::raw('count(*) as total'))
                ->whereNotNull('target_performance_area')
                ->where('target_performance_area', '!=', '')
                ->groupBy('target_performance_area')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn (Seminars $seminar): array => [
                    'area' => $seminar->target_performance_area,
                    'total' => (int) $seminar->total,
                ])
                ->all(),
        ];

        $recentAuditLogs = IwrAuditLog::query()
            ->leftJoin('employees', 'iwr_audit_log.employee_id', '=', 'employees.employee_id')
            ->select('iwr_audit_log.*', 'employees.name as employee_name')
            ->latest('logged_at')
            ->limit(8)
            ->get()
            ->map(fn (IwrAuditLog $log): array => [
                'id' => $log->id,
                'loggedAt' => optional($log->logged_at)->format('M d, Y h:i A') ?? '-',
                'employeeName' => $log->employee_name ?? $log->employee_id,
                'employeeId' => $log->employee_id,
                'documentType' => strtoupper($log->document_type),
                'routingAction' => $log->routing_action ?? 'unknown',
                'confidencePct' => $log->confidence_pct !== null ? (float) $log->confidence_pct : null,
                'compliancePassed' => (bool) $log->compliance_passed,
            ])
            ->all();

        return Inertia::render('admin/system-performance-dashboard', [
            'accountMetrics' => $accountMetrics,
            'workflowMetrics' => $workflowMetrics,
            'auditMetrics' => $auditMetrics,
            'trainingMetrics' => $trainingMetrics,
            'recentAuditLogs' => $recentAuditLogs,
        ]);
    }
}
