<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $request->string('period', 'this_month')->toString();
        $dateFrom = $request->string('dateFrom')->toString();
        $dateTo = $request->string('dateTo')->toString();

        [$startDate, $endDate] = $this->resolvePeriod($period, $dateFrom, $dateTo);

        $cacheKey = 'reports_dashboard_'.md5($period.$startDate->toDateString().$endDate->toDateString());

        $data = Cache::remember($cacheKey, 120, function () use ($startDate, $endDate): array {
            $s = $startDate->toDateString();
            $e = $endDate->toDateString();

            // Attendance — single aggregated query.
            $att = DB::selectOne("
                SELECT COUNT(*) AS total,
                       SUM(status = 'Present') AS present,
                       SUM(status = 'Late') AS late
                FROM attendance_records
                WHERE date >= ? AND date <= ?
            ", [$s, $e]);
            $total = (int) $att->total;
            $present = (int) $att->present;

            // Leave — two queries (one aggregate + one group-by).
            $leave = DB::selectOne("
                SELECT COUNT(*) AS total,
                       SUM(status = 'completed' AND has_rejection_reason = 0 AND dh_decision != 2 AND hr_decision != 2) AS approved,
                       SUM(status = 'completed' AND (has_rejection_reason = 1 OR dh_decision = 2 OR hr_decision = 2)) AS rejected,
                       SUM(status = 'routed') AS routed
                FROM leave_requests
                WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
            ", [$s, $e]);

            $leaveByType = DB::table('leave_requests')
                ->select('leave_type', DB::raw('count(*) as total'))
                ->whereDate('created_at', '>=', $s)
                ->whereDate('created_at', '<=', $e)
                ->groupBy('leave_type')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row): array => ['type' => $row->leave_type ?? 'Other', 'total' => (int) $row->total])
                ->all();

            // IPCR — single aggregated query.
            $ipcr = DB::selectOne('
                SELECT COUNT(*) AS total,
                       SUM(performance_rating IS NOT NULL) AS completed,
                       AVG(CASE WHEN performance_rating IS NOT NULL THEN performance_rating END) AS avg_rating,
                       SUM(performance_rating BETWEEN 4.71 AND 5.0) AS outstanding,
                       SUM(performance_rating BETWEEN 3.75 AND 4.70) AS very_outstanding,
                       SUM(performance_rating BETWEEN 3.00 AND 3.74) AS satisfactory,
                       SUM(performance_rating BETWEEN 2.01 AND 2.99) AS unsatisfactory,
                       SUM(performance_rating <= 2.00 AND performance_rating IS NOT NULL) AS poor
                FROM ipcr_submissions
                WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
            ', [$s, $e]);

            // IWR — single aggregated query.
            $audit = DB::selectOne('
                SELECT COUNT(*) AS total,
                       SUM(compliance_passed = 1) AS passed,
                       AVG(confidence_pct) AS avg_confidence,
                       SUM(confidence_pct < 60) AS low_confidence
                FROM iwr_audit_log
                WHERE DATE(logged_at) >= ? AND DATE(logged_at) <= ?
            ', [$s, $e]);
            $auditTotal = (int) $audit->total;
            $passed = (int) $audit->passed;

            // Training.
            $trainingByArea = DB::table('seminars')
                ->select('target_performance_area', DB::raw('count(*) as total'))
                ->whereDate('date', '>=', $s)
                ->whereDate('date', '<=', $e)
                ->whereNotNull('target_performance_area')
                ->where('target_performance_area', '!=', '')
                ->groupBy('target_performance_area')
                ->orderByDesc('total')
                ->limit(8)
                ->get()
                ->map(fn ($row): array => ['area' => $row->target_performance_area, 'total' => (int) $row->total])
                ->all();

            return [
                'attendance' => [
                    'totalRecords' => $total,
                    'presentCount' => $present,
                    'lateCount' => (int) $att->late,
                    'onTimeRate' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                ],
                'leave' => [
                    'total' => (int) $leave->total,
                    'approved' => (int) $leave->approved,
                    'rejected' => (int) $leave->rejected,
                    'routed' => (int) $leave->routed,
                    'byType' => $leaveByType,
                ],
                'performance' => [
                    'completedIpcr' => (int) $ipcr->completed,
                    'avgRating' => round((float) ($ipcr->avg_rating ?? 0), 2),
                    'ratingDistribution' => [
                        ['label' => 'Outstanding', 'count' => (int) $ipcr->outstanding],
                        ['label' => 'Very Outstanding', 'count' => (int) $ipcr->very_outstanding],
                        ['label' => 'Satisfactory', 'count' => (int) $ipcr->satisfactory],
                        ['label' => 'Unsatisfactory', 'count' => (int) $ipcr->unsatisfactory],
                        ['label' => 'Poor', 'count' => (int) $ipcr->poor],
                    ],
                ],
                'iwr' => [
                    'totalEvents' => $auditTotal,
                    'complianceRate' => $auditTotal > 0 ? round(($passed / $auditTotal) * 100, 1) : 0,
                    'avgConfidence' => round((float) ($audit->avg_confidence ?? 0), 2),
                    'lowConfidence' => (int) $audit->low_confidence,
                    'complianceBreakdown' => [
                        ['label' => 'Passed', 'count' => $passed],
                        ['label' => 'Failed', 'count' => $auditTotal - $passed],
                    ],
                ],
                'training' => [
                    'seminarCount' => DB::table('seminars')->whereDate('date', '>=', $s)->whereDate('date', '<=', $e)->count(),
                    'topArea' => $trainingByArea[0]['area'] ?? 'None',
                    'byArea' => $trainingByArea,
                ],
            ];
        });

        return Inertia::render('admin/reports-dashboard', [
            'period' => $period,
            'dateFrom' => $startDate->toDateString(),
            'dateTo' => $endDate->toDateString(),
            'attendance' => $data['attendance'],
            'leave' => $data['leave'],
            'performance' => $data['performance'],
            'iwr' => $data['iwr'],
            'training' => $data['training'],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $period = $request->string('period', 'this_month')->toString();
        $dateFrom = $request->string('dateFrom')->toString();
        $dateTo = $request->string('dateTo')->toString();

        [$startDate, $endDate] = $this->resolvePeriod($period, $dateFrom, $dateTo);

        $fileName = 'system-report-'.$startDate->format('Y-m-d').'-to-'.$endDate->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($startDate, $endDate): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Smart HRMS System Report']);
            fputcsv($handle, ['Period', $startDate->format('Y-m-d').' to '.$endDate->format('Y-m-d')]);
            fputcsv($handle, []);

            // Attendance
            $attendanceQuery = AttendanceRecord::query()
                ->whereDate('date', '>=', $startDate)
                ->whereDate('date', '<=', $endDate);
            $total = (clone $attendanceQuery)->count();
            $present = (clone $attendanceQuery)->where('status', 'Present')->count();
            $late = (clone $attendanceQuery)->where('status', 'Late')->count();

            fputcsv($handle, ['ATTENDANCE']);
            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Total Records', $total]);
            fputcsv($handle, ['Present', $present]);
            fputcsv($handle, ['Late', $late]);
            fputcsv($handle, ['On-Time Rate', $total > 0 ? round(($present / $total) * 100, 1).'%' : '0%']);
            fputcsv($handle, []);

            // Leave
            $leaveQuery = LeaveRequest::query()
                ->whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate);

            fputcsv($handle, ['LEAVE REQUESTS']);
            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Total', (clone $leaveQuery)->count()]);
            fputcsv($handle, ['Approved', (clone $leaveQuery)->where('status', 'completed')
                ->where('has_rejection_reason', false)
                ->where('dh_decision', '!=', 2)
                ->where('hr_decision', '!=', 2)
                ->count()]);
            fputcsv($handle, ['Rejected', (clone $leaveQuery)->where('status', 'completed')
                ->where(fn ($q) => $q->where('has_rejection_reason', true)
                    ->orWhere('dh_decision', 2)
                    ->orWhere('hr_decision', 2))
                ->count()]);
            fputcsv($handle, ['Routed', (clone $leaveQuery)->where('status', 'routed')->count()]);
            fputcsv($handle, []);

            // Performance
            $ipcrQuery = IpcrSubmission::query()
                ->whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate);

            fputcsv($handle, ['PERFORMANCE']);
            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Evaluations Completed', (clone $ipcrQuery)->whereNotNull('performance_rating')->count()]);
            fputcsv($handle, ['Average Rating', round((float) ((clone $ipcrQuery)->whereNotNull('performance_rating')->avg('performance_rating') ?? 0), 2)]);
            fputcsv($handle, []);

            // IWR
            $auditQuery = IwrAuditLog::query()
                ->whereDate('logged_at', '>=', $startDate)
                ->whereDate('logged_at', '<=', $endDate);
            $auditTotal = (clone $auditQuery)->count();
            $passed = (clone $auditQuery)->where('compliance_passed', true)->count();

            fputcsv($handle, ['IWR COMPLIANCE']);
            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Total Events', $auditTotal]);
            fputcsv($handle, ['Compliance Rate', $auditTotal > 0 ? round(($passed / $auditTotal) * 100, 1).'%' : '0%']);
            fputcsv($handle, ['Average Confidence', round((float) ((clone $auditQuery)->avg('confidence_pct') ?? 0), 2).'%']);

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolvePeriod(string $period, string $dateFrom, string $dateTo): array
    {
        return match ($period) {
            'last_month' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'this_quarter' => [now()->firstOfQuarter(), now()->endOfQuarter()],
            'this_year' => [now()->startOfYear(), now()->endOfYear()],
            'custom' => [
                $dateFrom ? Carbon::parse($dateFrom)->startOfDay() : now()->startOfMonth(),
                $dateTo ? Carbon::parse($dateTo)->endOfDay() : now()->endOfMonth(),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }
}
