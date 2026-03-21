<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaginationController extends Controller
{
    public function attendanceManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $attendances = AttendanceRecord::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('date', 'like', '%'.$search.'%')
                        ->orWhere('clock_in', 'like', '%'.$search.'%')
                        ->orWhere('clock_out', 'like', '%'.$search.'%')
                        ->orWhere('status', 'like', '%'.$search.'%');
                });
            })
            ->latest('date')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (AttendanceRecord $attendanceRecord): array => [
                'id' => $attendanceRecord->id,
                'name' => $attendanceRecord->name,
                'date' => $attendanceRecord->date?->format('Y-m-d') ?? '-',
                'clock_in' => $attendanceRecord->clock_in ?? '-',
                'clock_out' => $attendanceRecord->clock_out ?? '-',
                'status' => $attendanceRecord->status,
            ]);

        return Inertia::render('admin/attendance-management', [
            'search' => $search,
            'attendances' => $attendances->items(),
            'pagination' => [
                'currentPage' => $attendances->currentPage(),
                'lastPage' => $attendances->lastPage(),
                'perPage' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
        ]);
    }

    public function leaveManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $leaveRequests = LeaveRequest::query()
            ->with('user:id,name,employee_id')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('leave_type', 'like', '%'.$search.'%')
                        ->orWhere('reason', 'like', '%'.$search.'%')
                        ->orWhere('status', 'like', '%'.$search.'%')
                        ->orWhereHas('user', function ($userQuery) use ($search): void {
                            $userQuery->where('name', 'like', '%'.$search.'%');
                        });
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (LeaveRequest $leaveRequest): array => [
                'id' => $leaveRequest->id,
                'name' => $leaveRequest->user?->name ?? 'Unknown User',
                'leaveType' => $leaveRequest->leave_type,
                'startDate' => $leaveRequest->start_date?->format('Y-m-d') ?? '-',
                'endDate' => $leaveRequest->end_date?->format('Y-m-d') ?? '-',
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->status ?? 'pending',
                'stage' => $leaveRequest->stage,
            ]);

        return Inertia::render('admin/leave-management', [
            'search' => $search,
            'leaveRequests' => $leaveRequests->items(),
            'pagination' => [
                'currentPage' => $leaveRequests->currentPage(),
                'lastPage' => $leaveRequests->lastPage(),
                'perPage' => $leaveRequests->perPage(),
                'total' => $leaveRequests->total(),
            ],
        ]);
    }

    public function hrLeaveManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $leaveRequests = LeaveRequest::query()
            ->with('user:id,name,employee_id')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('leave_type', 'like', '%'.$search.'%')
                        ->orWhere('reason', 'like', '%'.$search.'%')
                        ->orWhere('status', 'like', '%'.$search.'%')
                        ->orWhereHas('user', function ($userQuery) use ($search): void {
                            $userQuery->where('name', 'like', '%'.$search.'%');
                        });
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (LeaveRequest $leaveRequest): array => [
                'id' => $leaveRequest->id,
                'name' => $leaveRequest->user?->name ?? 'Unknown User',
                'leaveType' => $leaveRequest->leave_type,
                'startDate' => $leaveRequest->start_date?->format('Y-m-d') ?? '-',
                'endDate' => $leaveRequest->end_date?->format('Y-m-d') ?? '-',
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->status ?? 'pending',
                'stage' => $leaveRequest->stage,
                'dhDecision' => $leaveRequest->dh_decision,
            ]);

        return Inertia::render('admin/hr-leave-management', [
            'search' => $search,
            'leaveRequests' => $leaveRequests->items(),
            'pagination' => [
                'currentPage' => $leaveRequests->currentPage(),
                'lastPage' => $leaveRequests->lastPage(),
                'perPage' => $leaveRequests->perPage(),
                'total' => $leaveRequests->total(),
            ],
        ]);
    }

    public function employeeDirectory(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $employees = User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'position' => 'Employee',
                'date_hired' => $user->created_at?->format('Y-m-d') ?? '-',
                'age' => 'N/A',
            ]);

        return Inertia::render('admin/employee-directory', [
            'search' => $search,
            'employees' => $employees->items(),
            'pagination' => [
                'currentPage' => $employees->currentPage(),
                'lastPage' => $employees->lastPage(),
                'perPage' => $employees->perPage(),
                'total' => $employees->total(),
            ],
        ]);
    }

    public function documentManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));
        $evaluatorEmployeeId = $request->user()->employee_id;

        $submissions = IpcrSubmission::query()
            ->with('employee.user')
            ->where('evaluator_id', $evaluatorEmployeeId)
            ->when($search !== '', function ($query) use ($search): void {
                $query->whereHas('employee.user', function ($q) use ($search): void {
                    $q->where('name', 'like', '%'.$search.'%')
                      ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (IpcrSubmission $submission): array => [
                'id' => $submission->employee?->user?->id ?? 0,
                'name' => $submission->employee?->name ?? 'Unknown',
                'email' => $submission->employee?->user?->email ?? '-',
                'role' => $submission->employee?->user?->role ?? 'employee',
                'position' => $submission->employee?->job_title ?? 'Employee',
                'employeeId' => $submission->employee_id,
                'submissionStatus' => $submission->status,
                'submissionStage' => $submission->stage,
            ]);

        return Inertia::render('document-management', [
            'search' => $search,
            'employees' => $submissions->items(),
            'pagination' => [
                'currentPage' => $submissions->currentPage(),
                'lastPage' => $submissions->lastPage(),
                'perPage' => $submissions->perPage(),
                'total' => $submissions->total(),
            ],
        ]);
    }

    public function adminHistoricalManagement(): Response
    {
        $search = trim((string) request()->string('search'));
        $perPage = max(1, min(50, (int) request()->integer('perPage', 10)));

        $historicalData = HistoricalDataRecord::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('employee_name', 'like', '%'.$search.'%')
                        ->orWhere('department_name', 'like', '%'.$search.'%')
                        ->orWhere('year', 'like', '%'.$search.'%')
                        ->orWhere('quarter', 'like', '%'.$search.'%')
                        ->orWhere('training_completion_status', 'like', '%'.$search.'%');
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (HistoricalDataRecord $historicalDataRecord): array => [
                'id' => $historicalDataRecord->id,
                'employeeName' => $historicalDataRecord->employee_name,
                'departmentName' => $historicalDataRecord->department_name,
                'year' => $historicalDataRecord->year,
                'quarter' => $historicalDataRecord->quarter,
                'attendancePunctualityRate' => $historicalDataRecord->attendance_punctuality_rate,
                'absenteeismDays' => $historicalDataRecord->absenteeism_days,
                'tardinessIncidents' => $historicalDataRecord->tardiness_incidents,
                'trainingCompletionStatus' => $historicalDataRecord->training_completion_status,
                'evaluatedPerformanceScore' => (float) $historicalDataRecord->evaluated_performance_score,
            ]);

        return Inertia::render('admin/historical-data', [
            'search' => $search,
            'historicalData' => $historicalData->items(),
            'pagination' => [
                'currentPage' => $historicalData->currentPage(),
                'lastPage' => $historicalData->lastPage(),
                'perPage' => $historicalData->perPage(),
                'total' => $historicalData->total(),
            ],
        ]);
    }
}
