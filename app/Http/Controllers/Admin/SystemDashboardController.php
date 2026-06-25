<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IwrAuditLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SystemDashboardController extends Controller
{
    public function index(): Response
    {
        $metrics = Cache::remember('system_dashboard', 120, function (): array {
            // Single aggregated query for all user counts.
            $userAgg = DB::selectOne("
                SELECT
                    COUNT(*) AS total,
                    SUM(is_active = 1) AS active,
                    SUM(is_active = 0) AS inactive,
                    SUM(two_factor_confirmed_at IS NOT NULL) AS two_factor_enabled,
                    SUM(role = 'hr-personnel') AS hr_personnel,
                    SUM(role = 'evaluator') AS evaluators,
                    SUM(role = 'employee') AS employees,
                    SUM(role = 'pmt') AS pmt
                FROM users
            ");

            // Single aggregated query for leave_requests counts.
            $leaveAgg = DB::selectOne("
                SELECT
                    COUNT(*) AS total,
                    SUM(status = 'routed') AS routed,
                    SUM(status = 'completed' AND dh_decision = 1 AND hr_decision = 1) AS completed,
                    SUM(status = 'returned' OR dh_decision = 2 OR hr_decision = 2) AS returned,
                    SUM(stage = 'rejection_reason_pending') AS pending_reason
                FROM leave_requests
            ");

            // Single aggregated query for ipcr_submissions counts.
            $ipcrAgg = DB::selectOne("
                SELECT
                    COUNT(*) AS total,
                    SUM(status = 'routed') AS routed,
                    SUM(status = 'completed') AS completed,
                    SUM(status = 'returned') AS returned,
                    SUM(stage = 'waiting_for_remarks') AS pending_evaluation
                FROM ipcr_submissions
            ");

            // Single aggregated query for iwr_audit_log counts.
            $auditAgg = DB::selectOne("
                SELECT
                    COUNT(*) AS total,
                    SUM(document_type = 'leave') AS leave_events,
                    SUM(document_type = 'ipcr') AS ipcr_events,
                    AVG(confidence_pct) AS avg_confidence,
                    SUM(confidence_pct < 60) AS low_confidence,
                    SUM(compliance_passed = 0) AS failed_compliance
                FROM iwr_audit_log
            ");

            $routingActions = DB::table('iwr_audit_log')
                ->select('routing_action', DB::raw('count(*) as total'))
                ->groupBy('routing_action')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn ($row): array => [
                    'action' => $row->routing_action ?? 'unknown',
                    'total' => (int) $row->total,
                ])
                ->all();

            $trainingAreas = DB::table('seminars')
                ->select('target_performance_area', DB::raw('count(*) as total'))
                ->whereNotNull('target_performance_area')
                ->where('target_performance_area', '!=', '')
                ->groupBy('target_performance_area')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn ($row): array => [
                    'area' => $row->target_performance_area,
                    'total' => (int) $row->total,
                ])
                ->all();

            return [
                'accountMetrics' => [
                    'total' => (int) $userAgg->total,
                    'active' => (int) $userAgg->active,
                    'inactive' => (int) $userAgg->inactive,
                    'twoFactorEnabled' => (int) $userAgg->two_factor_enabled,
                    'byRole' => [
                        'hrPersonnel' => (int) $userAgg->hr_personnel,
                        'evaluators' => (int) $userAgg->evaluators,
                        'employees' => (int) $userAgg->employees,
                        'pmt' => (int) $userAgg->pmt,
                    ],
                ],
                'workflowMetrics' => [
                    'leave' => [
                        'total' => (int) $leaveAgg->total,
                        'routed' => (int) $leaveAgg->routed,
                        'completed' => (int) $leaveAgg->completed,
                        'returned' => (int) $leaveAgg->returned,
                        'pendingReason' => (int) $leaveAgg->pending_reason,
                    ],
                    'ipcr' => [
                        'total' => (int) $ipcrAgg->total,
                        'routed' => (int) $ipcrAgg->routed,
                        'completed' => (int) $ipcrAgg->completed,
                        'returned' => (int) $ipcrAgg->returned,
                        'pendingEvaluation' => (int) $ipcrAgg->pending_evaluation,
                    ],
                ],
                'auditMetrics' => [
                    'totalEvents' => (int) $auditAgg->total,
                    'leaveEvents' => (int) $auditAgg->leave_events,
                    'ipcrEvents' => (int) $auditAgg->ipcr_events,
                    'averageConfidence' => round((float) ($auditAgg->avg_confidence ?? 0), 2),
                    'lowConfidenceCount' => (int) $auditAgg->low_confidence,
                    'failedComplianceCount' => (int) $auditAgg->failed_compliance,
                    'routingActions' => $routingActions,
                ],
                'trainingMetrics' => [
                    'scheduledCount' => DB::table('seminars')->count(),
                    'targetAreas' => $trainingAreas,
                ],
            ];
        });

        // Recent audit logs are always fresh (they're the live activity feed).
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
            ...$metrics,
            'recentAuditLogs' => $recentAuditLogs,
        ]);
    }
}
