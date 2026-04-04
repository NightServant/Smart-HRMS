<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $documentType = trim((string) $request->string('documentType'));
        $routingAction = trim((string) $request->string('routingAction'));
        $compliance = trim((string) $request->string('compliance'));
        $dateFrom = trim((string) $request->string('dateFrom'));
        $dateTo = trim((string) $request->string('dateTo'));
        $perPage = max(5, min(50, (int) $request->integer('perPage', 10)));

        $baseQuery = IwrAuditLog::query()
            ->leftJoin('employees', 'iwr_audit_log.employee_id', '=', 'employees.employee_id')
            ->select('iwr_audit_log.*', 'employees.name as employee_name')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('iwr_audit_log.employee_id', 'like', '%'.$search.'%')
                        ->orWhere('employees.name', 'like', '%'.$search.'%')
                        ->orWhere('iwr_audit_log.routing_action', 'like', '%'.$search.'%');
                });
            })
            ->when($documentType !== '', fn ($query) => $query->where('iwr_audit_log.document_type', $documentType))
            ->when($routingAction !== '', fn ($query) => $query->where('iwr_audit_log.routing_action', $routingAction))
            ->when($compliance === 'passed', fn ($query) => $query->where('iwr_audit_log.compliance_passed', true))
            ->when($compliance === 'failed', fn ($query) => $query->where('iwr_audit_log.compliance_passed', false))
            ->when($dateFrom !== '', fn ($query) => $query->whereDate('iwr_audit_log.logged_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($query) => $query->whereDate('iwr_audit_log.logged_at', '<=', $dateTo));

        $logs = (clone $baseQuery)
            ->latest('iwr_audit_log.logged_at')
            ->paginate($perPage)
            ->withQueryString();

        $items = collect($logs->items());
        $leaveIds = $items->where('document_type', 'leave')->pluck('document_id')->all();
        $ipcrIds = $items->where('document_type', 'ipcr')->pluck('document_id')->all();

        $leaveMap = LeaveRequest::query()->whereIn('id', $leaveIds)->get()->keyBy('id');
        $ipcrMap = IpcrSubmission::query()->whereIn('id', $ipcrIds)->get()->keyBy('id');

        $entries = $items->map(function (IwrAuditLog $log) use ($leaveMap, $ipcrMap): array {
            $document = $log->document_type === 'leave'
                ? $leaveMap->get($log->document_id)
                : $ipcrMap->get($log->document_id);

            return [
                'id' => $log->id,
                'loggedAt' => optional($log->logged_at)->format('Y-m-d H:i:s'),
                'employeeName' => $log->employee_name ?? $log->employee_id,
                'employeeId' => $log->employee_id,
                'documentType' => $log->document_type,
                'documentReference' => strtoupper($log->document_type).'-'.$log->document_id,
                'routingAction' => $log->routing_action ?? 'unknown',
                'confidencePct' => $log->confidence_pct !== null ? (float) $log->confidence_pct : null,
                'compliancePassed' => (bool) $log->compliance_passed,
                'status' => $document?->status,
                'stage' => $document?->stage,
            ];
        })->all();

        $summary = (clone $baseQuery)->select(DB::raw("
            COUNT(*) as total,
            SUM(iwr_audit_log.document_type = 'leave') as leave_events,
            SUM(iwr_audit_log.document_type = 'ipcr') as ipcr_events,
            SUM(iwr_audit_log.confidence_pct IS NOT NULL AND iwr_audit_log.confidence_pct < 60) as low_confidence_events,
            SUM(iwr_audit_log.compliance_passed = 0) as failed_compliance_events
        "))->first();

        return Inertia::render('admin/audit-logs', [
            'logs' => $entries,
            'filters' => [
                'search' => $search,
                'documentType' => $documentType,
                'routingAction' => $routingAction,
                'compliance' => $compliance,
                'dateFrom' => $dateFrom,
                'dateTo' => $dateTo,
            ],
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'leaveEvents' => (int) ($summary->leave_events ?? 0),
                'ipcrEvents' => (int) ($summary->ipcr_events ?? 0),
                'lowConfidenceEvents' => (int) ($summary->low_confidence_events ?? 0),
                'failedComplianceEvents' => (int) ($summary->failed_compliance_events ?? 0),
            ],
            'routingActions' => IwrAuditLog::query()
                ->select('routing_action')
                ->distinct()
                ->whereNotNull('routing_action')
                ->orderBy('routing_action')
                ->pluck('routing_action')
                ->all(),
            'pagination' => [
                'currentPage' => $logs->currentPage(),
                'lastPage' => $logs->lastPage(),
                'perPage' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
