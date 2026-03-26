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
    /**
     * @param  array<string, string>  $allowedSorts
     * @return array{sort: string, direction: string}
     */
    private function resolveSort(Request $request, array $allowedSorts, string $defaultSort, string $defaultDirection = 'asc'): array
    {
        $requestedSort = (string) $request->string('sort', $defaultSort);
        $requestedDirection = strtolower((string) $request->string('direction', $defaultDirection));

        $sort = array_key_exists($requestedSort, $allowedSorts) ? $requestedSort : $defaultSort;
        $direction = in_array($requestedDirection, ['asc', 'desc'], true) ? $requestedDirection : $defaultDirection;

        return [
            'sort' => $sort,
            'direction' => $direction,
        ];
    }

    public function attendanceManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $attendances = AttendanceRecord::query()
            ->with('employee')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->whereHas('employee', fn ($q) => $q->where('name', 'like', '%'.$search.'%'))
                        ->orWhere('date', 'like', '%'.$search.'%')
                        ->orWhere('status', 'like', '%'.$search.'%');
                });
            })
            ->latest('date')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (AttendanceRecord $record): array => [
                'id' => $record->id,
                'employee_name' => $record->employee?->name ?? 'Unknown',
                'date' => $record->date?->format('Y-m-d') ?? '-',
                'punch_time' => $record->punch_time?->format('H:i:s') ?? '-',
                'status' => $record->status,
                'source' => $record->source ?? 'import',
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
                'hasMedicalCertificate' => (bool) $leaveRequest->medical_certificate_path,
                'hasMarriageCertificate' => (bool) $leaveRequest->marriage_certificate_path,
                'hasSoloParentId' => (bool) $leaveRequest->solo_parent_id_path,
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
                'hasMedicalCertificate' => (bool) $leaveRequest->medical_certificate_path,
                'hasMarriageCertificate' => (bool) $leaveRequest->marriage_certificate_path,
                'hasSoloParentId' => (bool) $leaveRequest->solo_parent_id_path,
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
        $allowedSorts = [
            'employee_id' => 'users.employee_id',
            'name' => 'users.name',
            'email' => 'users.email',
            'position' => 'employees.job_title',
        ];
        ['sort' => $sort, 'direction' => $direction] = $this->resolveSort($request, $allowedSorts, 'name');

        $employees = User::query()
            ->select('users.*')
            ->with(['employee', 'employee.latestSubmission'])
            ->leftJoin('employees', 'users.employee_id', '=', 'employees.employee_id')
            ->where('role', User::ROLE_EMPLOYEE)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('users.name', 'like', '%'.$search.'%')
                        ->orWhere('users.email', 'like', '%'.$search.'%');
                });
            })
            ->orderBy($allowedSorts[$sort], $direction)
            ->when($sort !== 'name', function ($query) use ($allowedSorts, $direction): void {
                $query->orderBy($allowedSorts['name'], $direction);
            })
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'employee_id' => $user->employee_id ?? '',
                'position' => $user->employee?->job_title ?? 'Employee',
                'date_hired' => $user->created_at?->format('Y-m-d') ?? '-',

                'performance_rating' => $user->employee?->latestSubmission?->performance_rating,
                'remarks' => $user->employee?->latestSubmission?->rejection_reason,
                'notification' => $user->employee?->latestSubmission?->notification,
            ]);

        return Inertia::render('admin/employee-directory', [
            'search' => $search,
            'sort' => $sort,
            'direction' => $direction,
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

    public function adminHistoricalManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));
        $allowedSorts = [
            'employee_name' => 'employee_name',
            'department_name' => 'department_name',
            'year' => 'year',
            'quarter' => 'quarter',
            'attendance_punctuality_rate' => 'attendance_punctuality_rate',
            'absenteeism_days' => 'absenteeism_days',
            'tardiness_incidents' => 'tardiness_incidents',
            'training_completion_status' => 'training_completion_status',
            'evaluated_performance_score' => 'evaluated_performance_score',
        ];
        ['sort' => $sort, 'direction' => $direction] = $this->resolveSort($request, $allowedSorts, 'year', 'asc');

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
            ->orderBy('employee_name')
            ->orderBy('department_name')
            ->when($sort !== 'year', function ($query): void {
                $query->orderBy('year', 'desc');
            })
            ->when($sort === 'year', function ($query) use ($direction): void {
                $query->orderBy('year', $direction);
            })
            ->when($sort === 'quarter', function ($query) use ($direction): void {
                $query->orderByRaw(
                    "CASE quarter
                        WHEN 'Q1' THEN 1
                        WHEN 'Q2' THEN 2
                        WHEN 'Q3' THEN 3
                        WHEN 'Q4' THEN 4
                        ELSE 5
                    END {$direction}"
                );
            }, function ($query): void {
                $query->orderByRaw(
                    "CASE quarter
                        WHEN 'Q1' THEN 1
                        WHEN 'Q2' THEN 2
                        WHEN 'Q3' THEN 3
                        WHEN 'Q4' THEN 4
                        ELSE 5
                    END ASC"
                );
            })
            ->when(
                ! in_array($sort, ['employee_name', 'department_name', 'year', 'quarter'], true),
                function ($query) use ($allowedSorts, $sort, $direction): void {
                    $query->orderBy($allowedSorts[$sort], $direction);
                }
            )
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
            'sort' => $sort,
            'direction' => $direction,
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
