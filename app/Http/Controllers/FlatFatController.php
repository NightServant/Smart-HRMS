<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\LeaveRequest;
use App\Services\FlatFatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FlatFatController extends Controller
{
    /**
     * @var list<string>
     */
    private const EXCLUDED_EMPLOYEE_IDS = ['EMP-001'];

    public function __construct(private FlatFatService $flatFatService) {}

    /**
     * Get organization-wide FlatFAT scores.
     */
    public function organizationAggregate(Request $request): JsonResponse
    {
        try {
            $quarter = $request->query('quarter');
            $employees = Employee::query()
                ->whereNotIn('employee_id', self::EXCLUDED_EMPLOYEE_IDS)
                ->get();

            if ($employees->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'scope' => 'organization',
                        'total_employees' => 0,
                        'average_rating' => 0,
                        'high_risk_count' => 0,
                        'satisfactory_count' => 0,
                        'high_risk_percentage' => 0,
                    ],
                ]);
            }

            $employeeScores = [];
            foreach ($employees as $employee) {
                $score = $this->getEmployeeMetrics($employee->employee_id, $employee->name, $quarter);
                if ($score) {
                    $employeeScores[] = $score;
                }
            }

            $aggregate = $this->computeAggregate($employeeScores, $quarter);

            return response()->json([
                'status' => 'success',
                'data' => $aggregate,
            ]);
        } catch (\Exception $e) {
            \Log::error('FlatFAT organization aggregate controller error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve organization aggregate',
            ], 500);
        }
    }

    /**
     * Get FlatFAT scores for a specific employee.
     */
    public function employeeScore(Request $request, string $employeeId): JsonResponse
    {
        try {
            $quarter = $request->query('quarter');
            $employee = Employee::find($employeeId);
            $employeeName = $employee?->name ?? '';

            $data = $this->getEmployeeMetrics($employeeId, $employeeName, $quarter);

            if (! $data) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found or no metrics available',
                ], 404);
            }

            $score = $this->flatFatService->calculateEmployeeScore(
                $employeeId,
                $data,
                $quarter
            );

            return response()->json([
                'status' => 'success',
                'data' => $score,
            ]);
        } catch (\Exception $e) {
            \Log::error("FlatFAT employee score controller error: {$e->getMessage()}");

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve employee score',
            ], 500);
        }
    }

    /**
     * Get attendance metrics for real-time dashboard.
     * Returns current month breakdown: late, absent, on leave, present.
     */
    public function attendanceMetrics(Request $request): JsonResponse
    {
        try {
            $quarter = $request->query('quarter');
            $today = now();
            $startOfMonth = $today->copy()->startOfMonth();
            $endOfMonth = $today->copy()->endOfMonth();

            // Get attendance records for current month
            $attendanceRecords = AttendanceRecord::whereBetween('date', [$startOfMonth, $endOfMonth])->get();

            $totalEmployees = Employee::count();
            $presentCount = $attendanceRecords->where('status', 'Present')->count();
            $lateCount = $attendanceRecords->where('status', 'Late')->count();

            // Employees on approved leave today
            $onLeaveCount = LeaveRequest::where('status', 'approved')
                ->where('start_date', '<=', $today->toDateString())
                ->where('end_date', '>=', $today->toDateString())
                ->count();

            // Employees with no attendance record today
            $employeesWithRecordToday = AttendanceRecord::where('date', $today->toDateString())
                ->distinct('employee_id')
                ->count('employee_id');
            $absentCount = max(0, $totalEmployees - $employeesWithRecordToday - $onLeaveCount);

            $totalDays = $attendanceRecords->count();
            $attendancePct = $totalDays > 0 ? ($presentCount / $totalDays) * 100 : 0;

            return response()->json([
                'status' => 'success',
                'data' => [
                    'attendance_pct' => round($attendancePct, 2),
                    'total_days' => $totalDays,
                    'present_days' => $presentCount,
                    'late_count' => $lateCount,
                    'absent_count' => $absentCount,
                    'on_leave_count' => $onLeaveCount,
                    'present_count' => $presentCount,
                    'quarter' => $quarter,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('FlatFAT attendance metrics error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve attendance metrics',
            ], 500);
        }
    }

    /**
     * Get quarterly performance trends with per-employee scores.
     */
    public function quarterScores(Request $request): JsonResponse
    {
        try {
            $quarter = $request->query('quarter');
            $employees = Employee::query()
                ->whereNotIn('employee_id', self::EXCLUDED_EMPLOYEE_IDS)
                ->get();

            if ($employees->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'quarter' => $quarter,
                        'average_rating' => 0,
                        'employee_scores' => [],
                        'scores' => [],
                    ],
                ]);
            }

            $employeeScores = [];
            $detailedScores = [];

            foreach ($employees as $employee) {
                $metrics = $this->getEmployeeMetrics($employee->employee_id, $employee->name, $quarter);
                if ($metrics) {
                    $employeeScores[] = $metrics;
                    $detailedScores[] = [
                        'employee_name' => $employee->name,
                        'final_rating' => $this->computeFinalRating($metrics),
                    ];
                }
            }

            $aggregate = $this->computeAggregate($employeeScores, $quarter);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'quarter' => $quarter,
                    'average_rating' => $aggregate['average_rating'] ?? 0,
                    'employee_scores' => $detailedScores,
                    'aggregate' => $aggregate,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('FlatFAT quarter scores error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve quarter scores',
            ], 500);
        }
    }

    /**
     * Get employee-specific quarterly scores (for employee dashboard).
     */
    public function employeeQuarterScores(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $employeeId = $user?->employee_id;

            if (! $employeeId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No employee profile linked',
                ], 404);
            }

            $employee = Employee::find($employeeId);
            if (! $employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found',
                ], 404);
            }

            // Get historical data for all quarters
            $historicalRecords = HistoricalDataRecord::where('employee_name', $employee->name)
                ->orderBy('year')
                ->orderByRaw("CAST(REPLACE(quarter, 'Q', '') AS UNSIGNED)")
                ->get();

            if ($historicalRecords->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'data' => null,
                    'message' => 'No historical performance data available for this employee.',
                ]);
            }

            $quarterScores = [];
            foreach (['Q1', 'Q2', 'Q3', 'Q4'] as $q) {
                $records = $historicalRecords->where('quarter', $q);
                if ($records->isNotEmpty()) {
                    $avgScore = $records->avg('evaluated_performance_score');
                    $quarterScores[$q] = round($avgScore, 2);
                } else {
                    $quarterScores[$q] = 0;
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee_name' => $employee->name,
                    'quarter_scores' => $quarterScores,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('FlatFAT employee quarter scores error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve employee quarter scores',
            ], 500);
        }
    }

    /**
     * Compute FlatFAT final rating from raw metrics.
     * Formula: (perf/5 * 0.50 + att/100 * 0.30 + task/100 * 0.20) * 5.0
     */
    private function computeFinalRating(array $metrics): float
    {
        return round(
            ($metrics['performance_rating'] / 5.0 * 0.50 +
             $metrics['attendance_pct'] / 100.0 * 0.30 +
             $metrics['task_completion_pct'] / 100.0 * 0.20) * 5.0,
            2
        );
    }

    /**
     * Compute organization aggregate from raw employee metrics in PHP.
     *
     * @param  array<int, array{performance_rating: float, attendance_pct: float, task_completion_pct: float}>  $rawMetrics
     * @return array<string, mixed>
     */
    private function computeAggregate(array $rawMetrics, ?string $quarter = null): array
    {
        if (empty($rawMetrics)) {
            return [
                'scope' => 'organization',
                'total_employees' => 0,
                'average_rating' => 0,
                'high_risk_count' => 0,
                'satisfactory_count' => 0,
                'high_risk_percentage' => 0,
            ];
        }

        $totalEmployees = count($rawMetrics);
        $totalRating = 0;
        $highRiskCount = 0;

        foreach ($rawMetrics as $metrics) {
            $finalRating = $this->computeFinalRating($metrics);
            $totalRating += $finalRating;

            if ($finalRating < 3.0) {
                $highRiskCount++;
            }
        }

        $averageRating = $totalRating / $totalEmployees;
        $satisfactoryCount = $totalEmployees - $highRiskCount;

        return [
            'scope' => 'organization',
            'total_employees' => $totalEmployees,
            'average_rating' => round($averageRating, 2),
            'high_risk_count' => $highRiskCount,
            'satisfactory_count' => $satisfactoryCount,
            'high_risk_percentage' => round(($highRiskCount / $totalEmployees) * 100, 2),
            'quarter' => $quarter,
        ];
    }

    /**
     * Helper: Get employee metrics using IPCR, attendance records, and historical data.
     */
    private function getEmployeeMetrics(string $employeeId, string $employeeName = '', ?string $quarter = null): ?array
    {
        try {
            // Get latest evaluated performance rating from IPCR submission
            $ipcr = IpcrSubmission::where('employee_id', $employeeId)
                ->whereNotNull('performance_rating')
                ->orderBy('updated_at', 'desc')
                ->first();

            $performanceRating = $ipcr?->performance_rating ?? null;

            // Get attendance percentage from biometric records
            $attendanceQuery = AttendanceRecord::where('employee_id', $employeeId);
            $attendanceRecords = $attendanceQuery->get();

            $attendancePct = null;
            if ($attendanceRecords->count() > 0) {
                $presentDays = $attendanceRecords->where('status', 'Present')->count();
                $attendancePct = ($presentDays / $attendanceRecords->count()) * 100;
            }

            // Get historical data as secondary source
            $historicalQuery = HistoricalDataRecord::where('employee_name', $employeeName);
            if ($quarter) {
                $historicalQuery->where('quarter', $quarter);
            }
            $historicalData = $historicalQuery->orderBy('year', 'desc')->first();

            // Use historical data as fallback
            if ($performanceRating === null) {
                $performanceRating = $historicalData?->evaluated_performance_score ?? 2.5;
            }
            if ($attendancePct === null && $historicalData) {
                $attendancePct = (float) ($historicalData->attendance_punctuality_rate ?? 80.0);
            }
            $attendancePct = $attendancePct ?? 80.0;

            $taskCompletion = $historicalData?->evaluated_performance_score
                ? ($historicalData->evaluated_performance_score / 5.0) * 100.0
                : 75.0;

            return [
                'performance_rating' => (float) $performanceRating,
                'attendance_pct' => (float) $attendancePct,
                'task_completion_pct' => (float) $taskCompletion,
            ];
        } catch (\Exception $e) {
            \Log::error("Error getting employee metrics for {$employeeId}: {$e->getMessage()}");

            return null;
        }
    }
}
