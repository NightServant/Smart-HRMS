<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Seminars;
use Carbon\Carbon;
use Illuminate\Http\Request;
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

        // Attendance metrics
        $attendanceQuery = AttendanceRecord::query()
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate);

        $totalAttendance = (clone $attendanceQuery)->count();
        $presentCount = (clone $attendanceQuery)->where('status', 'Present')->count();
        $lateCount = (clone $attendanceQuery)->where('status', 'Late')->count();
        $onTimeRate = $totalAttendance > 0 ? round(($presentCount / $totalAttendance) * 100, 1) : 0;

        // Leave metrics
        $leaveQuery = LeaveRequest::query()
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);

        $totalLeaves = (clone $leaveQuery)->count();
        $approvedLeaves = (clone $leaveQuery)->where('status', 'completed')
            ->where('has_rejection_reason', false)
            ->where('dh_decision', '!=', 2)
            ->where('hr_decision', '!=', 2)
            ->count();
        $rejectedLeaves = (clone $leaveQuery)->where('status', 'completed')
            ->where(fn ($q) => $q->where('has_rejection_reason', true)
                ->orWhere('dh_decision', 2)
                ->orWhere('hr_decision', 2))
            ->count();
        $routedLeaves = (clone $leaveQuery)->where('status', 'routed')->count();

        $leaveByType = (clone $leaveQuery)
            ->select('leave_type', DB::raw('count(*) as total'))
            ->groupBy('leave_type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'type' => $row->leave_type ?? 'Other',
                'total' => (int) $row->total,
            ])->all();

        // Performance metrics
        $ipcrQuery = IpcrSubmission::query()
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);

        $completedIpcr = (clone $ipcrQuery)->whereNotNull('performance_rating')->count();
        $avgRating = round((float) ((clone $ipcrQuery)->whereNotNull('performance_rating')->avg('performance_rating') ?? 0), 2);

        $ratingDistribution = [
            ['label' => 'Outstanding', 'count' => (clone $ipcrQuery)->whereBetween('performance_rating', [4.71, 5.0])->count()],
            ['label' => 'Very Outstanding', 'count' => (clone $ipcrQuery)->whereBetween('performance_rating', [3.75, 4.70])->count()],
            ['label' => 'Satisfactory', 'count' => (clone $ipcrQuery)->whereBetween('performance_rating', [3.00, 3.74])->count()],
            ['label' => 'Unsatisfactory', 'count' => (clone $ipcrQuery)->whereBetween('performance_rating', [2.01, 2.99])->count()],
            ['label' => 'Poor', 'count' => (clone $ipcrQuery)->where('performance_rating', '<=', 2.00)->whereNotNull('performance_rating')->count()],
        ];

        // IWR metrics
        $auditQuery = IwrAuditLog::query()
            ->whereDate('logged_at', '>=', $startDate)
            ->whereDate('logged_at', '<=', $endDate);

        $totalAuditEvents = (clone $auditQuery)->count();
        $compliancePassed = (clone $auditQuery)->where('compliance_passed', true)->count();
        $complianceRate = $totalAuditEvents > 0 ? round(($compliancePassed / $totalAuditEvents) * 100, 1) : 0;
        $avgConfidence = round((float) ((clone $auditQuery)->avg('confidence_pct') ?? 0), 2);
        $lowConfidence = (clone $auditQuery)->where('confidence_pct', '<', 60)->count();

        $complianceBreakdown = [
            ['label' => 'Passed', 'count' => $compliancePassed],
            ['label' => 'Failed', 'count' => $totalAuditEvents - $compliancePassed],
        ];

        // Training metrics
        $seminarQuery = Seminars::query()
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate);

        $seminarCount = (clone $seminarQuery)->count();
        $trainingByArea = (clone $seminarQuery)
            ->select('target_performance_area', DB::raw('count(*) as total'))
            ->whereNotNull('target_performance_area')
            ->where('target_performance_area', '!=', '')
            ->groupBy('target_performance_area')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($row): array => [
                'area' => $row->target_performance_area,
                'total' => (int) $row->total,
            ])->all();

        $topArea = $trainingByArea[0]['area'] ?? 'None';

        return Inertia::render('admin/reports-dashboard', [
            'period' => $period,
            'dateFrom' => $startDate->toDateString(),
            'dateTo' => $endDate->toDateString(),
            'attendance' => [
                'totalRecords' => $totalAttendance,
                'presentCount' => $presentCount,
                'lateCount' => $lateCount,
                'onTimeRate' => $onTimeRate,
            ],
            'leave' => [
                'total' => $totalLeaves,
                'approved' => $approvedLeaves,
                'rejected' => $rejectedLeaves,
                'routed' => $routedLeaves,
                'byType' => $leaveByType,
            ],
            'performance' => [
                'completedIpcr' => $completedIpcr,
                'avgRating' => $avgRating,
                'ratingDistribution' => $ratingDistribution,
            ],
            'iwr' => [
                'totalEvents' => $totalAuditEvents,
                'complianceRate' => $complianceRate,
                'avgConfidence' => $avgConfidence,
                'lowConfidence' => $lowConfidence,
                'complianceBreakdown' => $complianceBreakdown,
            ],
            'training' => [
                'seminarCount' => $seminarCount,
                'topArea' => $topArea,
                'byArea' => $trainingByArea,
            ],
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
