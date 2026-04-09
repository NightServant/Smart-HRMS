<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateEmployeeEmploymentStatusRequest;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
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

    /**
     * @return array<int, string>
     */
    private function leaveRequestFilterOptions(string $column): array
    {
        return LeaveRequest::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->map(fn ($value): string => (string) $value)
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     evaluatorName: string|null,
     *     evaluatorDate: string|null,
     *     hrPersonnelName: string|null,
     *     hrPersonnelDate: string|null
     * }
     */
    private function leaveWorkflowSignOffResource(LeaveRequest $leaveRequest): array
    {
        $notifications = Notification::query()
            ->with('user:id,name,role')
            ->where('document_type', 'leave')
            ->where('document_id', $leaveRequest->id)
            ->oldest()
            ->get();

        $evaluatorNotification = $notifications->first(
            fn (Notification $notification): bool => $notification->user?->role === User::ROLE_EVALUATOR,
        );
        $hrNotification = $notifications->first(
            fn (Notification $notification): bool => $notification->user?->role === User::ROLE_HR_PERSONNEL,
        );

        return [
            'evaluatorName' => $evaluatorNotification?->user?->name,
            'evaluatorDate' => $evaluatorNotification?->created_at?->format('M d, Y g:i A'),
            'hrPersonnelName' => $hrNotification?->user?->name,
            'hrPersonnelDate' => $hrNotification?->created_at?->format('M d, Y g:i A'),
        ];
    }

    private function applyLeaveStatusFilter(Builder $query, string $statusFilter): void
    {
        if ($statusFilter === 'completed') {
            $query
                ->where('dh_decision', 1)
                ->where('hr_decision', 1);

            return;
        }

        if ($statusFilter === 'returned') {
            $query->where(function (Builder $statusQuery): void {
                $statusQuery
                    ->where('status', 'returned')
                    ->orWhere('dh_decision', 2)
                    ->orWhere('hr_decision', 2);
            });

            return;
        }

        $query->where('status', $statusFilter);
    }

    /**
     * @return array{semester: 1|2, year: int}
     */
    private function resolveIpcrTargetPeriod(string $periodLabel, int $fallbackYear): array
    {
        preg_match('/(20\d{2})/', $periodLabel, $yearMatches);

        $normalizedLabel = strtolower(str_replace(['–', '—'], '-', $periodLabel));
        $resolvedYear = isset($yearMatches[1]) ? (int) $yearMatches[1] : $fallbackYear;
        $isSecondSemester = str_contains($normalizedLabel, 'second')
            || (str_contains($normalizedLabel, 'july') && str_contains($normalizedLabel, 'december'));

        return [
            'semester' => $isSecondSemester ? 2 : 1,
            'year' => $resolvedYear,
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

        $totalRecords = AttendanceRecord::query()->count();
        $presentCount = AttendanceRecord::query()->where('status', 'Present')->count();
        $lateCount = AttendanceRecord::query()->where('status', 'Late')->count();
        $absentCount = max(0, $totalRecords - $presentCount - $lateCount);
        $biometricCount = AttendanceRecord::query()->where('source', 'biometric')->count();
        $manualCount = AttendanceRecord::query()->where('source', 'manual')->count();
        $importCount = AttendanceRecord::query()->where('source', 'import')->count();

        return Inertia::render('admin/attendance-management', [
            'search' => $search,
            'attendances' => $attendances->items(),
            'pagination' => [
                'currentPage' => $attendances->currentPage(),
                'lastPage' => $attendances->lastPage(),
                'perPage' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
            'stats' => [
                'totalRecords' => $totalRecords,
                'presentCount' => $presentCount,
                'lateCount' => $lateCount,
                'absentCount' => $absentCount,
                'biometricCount' => $biometricCount,
                'manualCount' => $manualCount,
                'importCount' => $importCount,
            ],
        ]);
    }

    public function leaveManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $leaveTypeFilter = trim((string) $request->string('leaveTypeFilter'));
        $statusFilter = trim((string) $request->string('statusFilter'));
        $stageFilter = trim((string) $request->string('stageFilter'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $leaveRequests = LeaveRequest::query()
            ->with(['user:id,name,employee_id', 'employee:employee_id,name,job_title'])
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
            ->when($leaveTypeFilter !== '', function ($query) use ($leaveTypeFilter): void {
                $query->where('leave_type', $leaveTypeFilter);
            })
            ->when($statusFilter !== '', function ($query) use ($statusFilter): void {
                $this->applyLeaveStatusFilter($query, $statusFilter);
            })
            ->when($stageFilter !== '', function ($query) use ($stageFilter): void {
                $query->where('stage', $stageFilter);
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (LeaveRequest $leaveRequest): array => [
                'id' => $leaveRequest->id,
                'name' => $leaveRequest->user?->name ?? 'Unknown User',
                'employeeId' => $leaveRequest->employee_id,
                'jobTitle' => $leaveRequest->employee?->job_title,
                'leaveType' => $leaveRequest->leave_type,
                'startDate' => $leaveRequest->start_date?->format('Y-m-d') ?? '-',
                'endDate' => $leaveRequest->end_date?->format('Y-m-d') ?? '-',
                'daysRequested' => $leaveRequest->days_requested,
                'leaveAccrual' => $leaveRequest->leaveAccrual(),
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->resolvedStatus(),
                'stage' => $leaveRequest->stage,
                'dhDecision' => (int) $leaveRequest->dh_decision,
                'hrDecision' => (int) $leaveRequest->hr_decision,
                'rejectionReasonText' => $leaveRequest->rejection_reason_text,
                'hasMedicalCertificate' => (bool) $leaveRequest->medical_certificate_path,
                'hasMarriageCertificate' => (bool) $leaveRequest->marriage_certificate_path,
                'hasSoloParentId' => (bool) $leaveRequest->solo_parent_id_path,
                'createdAt' => $leaveRequest->created_at?->format('M d, Y g:i A'),
                'workflowSignOff' => $this->leaveWorkflowSignOffResource($leaveRequest),
            ]);

        $evalStats = [
            'pendingReview' => LeaveRequest::query()->where('stage', 'sent_to_department_head')->count(),
            'approvedByDh' => LeaveRequest::query()->where('dh_decision', 1)->count(),
            'returnedByDh' => LeaveRequest::query()->where('dh_decision', 2)->count(),
            'total' => LeaveRequest::query()->count(),
        ];

        return Inertia::render('admin/leave-management', [
            'search' => $search,
            'leaveTypeFilter' => $leaveTypeFilter,
            'statusFilter' => $statusFilter,
            'stageFilter' => $stageFilter,
            'leaveTypeOptions' => $this->leaveRequestFilterOptions('leave_type'),
            'statusOptions' => $this->leaveRequestFilterOptions('status'),
            'stageOptions' => $this->leaveRequestFilterOptions('stage'),
            'leaveRequests' => $leaveRequests->items(),
            'pagination' => [
                'currentPage' => $leaveRequests->currentPage(),
                'lastPage' => $leaveRequests->lastPage(),
                'perPage' => $leaveRequests->perPage(),
                'total' => $leaveRequests->total(),
            ],
            'stats' => $evalStats,
        ]);
    }

    public function hrLeaveManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $leaveTypeFilter = trim((string) $request->string('leaveTypeFilter'));
        $statusFilter = trim((string) $request->string('statusFilter'));
        $stageFilter = trim((string) $request->string('stageFilter'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));

        $leaveRequests = LeaveRequest::query()
            ->with(['user:id,name,employee_id', 'employee:employee_id,name,job_title'])
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
            ->when($leaveTypeFilter !== '', function ($query) use ($leaveTypeFilter): void {
                $query->where('leave_type', $leaveTypeFilter);
            })
            ->when($statusFilter !== '', function ($query) use ($statusFilter): void {
                $this->applyLeaveStatusFilter($query, $statusFilter);
            })
            ->when($stageFilter !== '', function ($query) use ($stageFilter): void {
                $query->where('stage', $stageFilter);
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (LeaveRequest $leaveRequest): array => [
                'id' => $leaveRequest->id,
                'name' => $leaveRequest->user?->name ?? 'Unknown User',
                'employeeId' => $leaveRequest->employee_id,
                'jobTitle' => $leaveRequest->employee?->job_title,
                'leaveType' => $leaveRequest->leave_type,
                'startDate' => $leaveRequest->start_date?->format('Y-m-d') ?? '-',
                'endDate' => $leaveRequest->end_date?->format('Y-m-d') ?? '-',
                'daysRequested' => $leaveRequest->days_requested,
                'leaveAccrual' => $leaveRequest->leaveAccrual(),
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->resolvedStatus(),
                'stage' => $leaveRequest->stage,
                'dhDecision' => (int) $leaveRequest->dh_decision,
                'hrDecision' => (int) $leaveRequest->hr_decision,
                'rejectionReasonText' => $leaveRequest->rejection_reason_text,
                'hasMedicalCertificate' => (bool) $leaveRequest->medical_certificate_path,
                'hasMarriageCertificate' => (bool) $leaveRequest->marriage_certificate_path,
                'hasSoloParentId' => (bool) $leaveRequest->solo_parent_id_path,
                'createdAt' => $leaveRequest->created_at?->format('M d, Y g:i A'),
                'workflowSignOff' => $this->leaveWorkflowSignOffResource($leaveRequest),
            ]);

        $hrStats = [
            'pendingReview' => LeaveRequest::query()->where('stage', 'sent_to_hr')->count(),
            'fullyApproved' => LeaveRequest::query()->where('status', 'completed')->where('hr_decision', 1)->count(),
            'rejectedByHr' => LeaveRequest::query()->where('hr_decision', 2)->count(),
            'total' => LeaveRequest::query()->count(),
        ];

        return Inertia::render('admin/hr-leave-management', [
            'search' => $search,
            'leaveTypeFilter' => $leaveTypeFilter,
            'statusFilter' => $statusFilter,
            'stageFilter' => $stageFilter,
            'leaveTypeOptions' => $this->leaveRequestFilterOptions('leave_type'),
            'statusOptions' => $this->leaveRequestFilterOptions('status'),
            'stageOptions' => $this->leaveRequestFilterOptions('stage'),
            'leaveRequests' => $leaveRequests->items(),
            'pagination' => [
                'currentPage' => $leaveRequests->currentPage(),
                'lastPage' => $leaveRequests->lastPage(),
                'perPage' => $leaveRequests->perPage(),
                'total' => $leaveRequests->total(),
            ],
            'stats' => $hrStats,
        ]);
    }

    public function evaluatorAttendanceManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));
        $evaluatorEmployeeId = $request->user()->employee_id;

        $attendances = AttendanceRecord::query()
            ->with('employee')
            ->whereHas('employee', fn ($q) => $q->where('supervisor_id', $evaluatorEmployeeId))
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
                'employee_id' => $record->employee_id,
                'date' => $record->date?->format('Y-m-d') ?? '-',
                'punch_time' => $record->punch_time?->format('H:i:s') ?? '-',
                'status' => $record->status,
                'source' => $record->source ?? 'import',
            ]);

        $subordinateIds = \App\Models\Employee::query()
            ->where('supervisor_id', $evaluatorEmployeeId)
            ->pluck('employee_id');

        $totalRecords = AttendanceRecord::query()->whereIn('employee_id', $subordinateIds)->count();
        $presentCount = AttendanceRecord::query()->whereIn('employee_id', $subordinateIds)->where('status', 'Present')->count();
        $lateCount = AttendanceRecord::query()->whereIn('employee_id', $subordinateIds)->where('status', 'Late')->count();

        $subordinates = \App\Models\Employee::query()
            ->where('supervisor_id', $evaluatorEmployeeId)
            ->get(['employee_id', 'name', 'manual_punch_enabled', 'manual_punch_reason', 'manual_punch_start_date', 'manual_punch_end_date'])
            ->map(fn (\App\Models\Employee $emp): array => [
                'employee_id' => $emp->employee_id,
                'name' => $emp->name,
                'manual_punch_enabled' => (bool) $emp->manual_punch_enabled,
                'manual_punch_reason' => $emp->manual_punch_reason,
                'manual_punch_start_date' => $emp->manual_punch_start_date !== null
                    ? Carbon::parse($emp->manual_punch_start_date)->toDateString()
                    : null,
                'manual_punch_end_date' => $emp->manual_punch_end_date !== null
                    ? Carbon::parse($emp->manual_punch_end_date)->toDateString()
                    : null,
            ]);

        return Inertia::render('admin/evaluator-attendance', [
            'search' => $search,
            'attendances' => $attendances->items(),
            'pagination' => [
                'currentPage' => $attendances->currentPage(),
                'lastPage' => $attendances->lastPage(),
                'perPage' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
            'stats' => [
                'totalRecords' => $totalRecords,
                'presentCount' => $presentCount,
                'lateCount' => $lateCount,
                'absentCount' => max(0, $totalRecords - $presentCount - $lateCount),
            ],
            'subordinates' => $subordinates,
        ]);
    }

    public function employeeDirectory(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));
        $statusFilter = trim((string) $request->string('statusFilter'));
        $positionFilter = trim((string) $request->string('positionFilter'));
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
            ->when($statusFilter !== '', function ($query) use ($statusFilter): void {
                $query->where('employees.employment_status', $statusFilter);
            })
            ->when($positionFilter !== '', function ($query) use ($positionFilter): void {
                $query->where('employees.job_title', $positionFilter);
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
                'employment_status' => $user->employee?->employment_status ?? 'regular',
                'date_hired' => $user->employee?->date_hired?->format('Y-m-d') ?? '',

                'performance_rating' => $user->employee?->latestSubmission?->performance_rating,
                'remarks' => $user->employee?->latestSubmission?->rejection_reason,
                'notification' => $user->employee?->latestSubmission?->notification,
            ]);

        $allEmployees = \App\Models\Employee::query();
        $positions = \App\Models\Employee::query()
            ->whereNotNull('job_title')
            ->distinct()
            ->pluck('job_title')
            ->sort()
            ->values()
            ->all();

        $stats = [
            'total' => (clone $allEmployees)->count(),
            'casual' => (clone $allEmployees)->where('employment_status', 'casual')->count(),
            'regular' => (clone $allEmployees)->where('employment_status', 'regular')->count(),
            'job_order' => (clone $allEmployees)->where('employment_status', 'job_order')->count(),
        ];

        return Inertia::render('admin/employee-directory', [
            'search' => $search,
            'sort' => $sort,
            'direction' => $direction,
            'statusFilter' => $statusFilter,
            'positionFilter' => $positionFilter,
            'employees' => $employees->items(),
            'pagination' => [
                'currentPage' => $employees->currentPage(),
                'lastPage' => $employees->lastPage(),
                'perPage' => $employees->perPage(),
                'total' => $employees->total(),
            ],
            'stats' => $stats,
            'positions' => $positions,
        ]);
    }

    public function updateEmployeeEmploymentStatus(UpdateEmployeeEmploymentStatusRequest $request, Employee $employee): RedirectResponse
    {
        $employee->update($request->validated());

        return back();
    }

    public function documentManagement(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $perPage = max(1, min(50, (int) $request->integer('perPage', 10)));
        $statusFilter = trim((string) $request->string('statusFilter'));
        $stageFilter = trim((string) $request->string('stageFilter'));
        $currentPeriodLabel = (string) SystemSetting::get('ipcr_period_label', 'January to June '.now()->year);
        $currentPeriodYear = (int) SystemSetting::get('ipcr_period_year', (int) now()->year);
        ['semester' => $targetSemester, 'year' => $targetYear] = $this->resolveIpcrTargetPeriod($currentPeriodLabel, $currentPeriodYear);
        $employeeIds = collect(range(2, 21))
            ->map(fn (int $number): string => 'EMP-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT))
            ->all();

        $employees = Employee::query()
            ->with([
                'user',
                'latestSubmission',
                'ipcrTargets' => fn ($query) => $query
                    ->forPeriod($targetSemester, $targetYear)
                    ->latest('id'),
            ])
            ->whereIn('employee_id', $employeeIds)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('employee_id', 'like', '%'.$search.'%')
                        ->orWhere('name', 'like', '%'.$search.'%')
                        ->orWhere('job_title', 'like', '%'.$search.'%');
                });
            })
            ->when($statusFilter !== '', function ($query) use ($statusFilter): void {
                $query->whereHas('latestSubmission', function ($submissionQuery) use ($statusFilter): void {
                    $submissionQuery->where('status', $statusFilter);
                });
            })
            ->when($stageFilter !== '', function ($query) use ($stageFilter): void {
                $query->whereHas('latestSubmission', function ($submissionQuery) use ($stageFilter): void {
                    $submissionQuery->where('stage', $stageFilter);
                });
            })
            ->orderBy('employee_id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Employee $employee): array {
                $currentTarget = $employee->ipcrTargets->first();

                return [
                    'id' => $employee->user?->id ?? 0,
                    'name' => $employee->name ?? 'Unknown',
                    'email' => $employee->user?->email ?? '-',
                    'role' => $employee->user?->role ?? 'employee',
                    'position' => $employee->job_title ?? 'Employee',
                    'employeeId' => $employee->employee_id,
                    'submissionStatus' => $employee->latestSubmission?->status,
                    'submissionStage' => $employee->latestSubmission?->stage,
                    'finalRating' => $employee->latestSubmission?->final_rating,
                    'remarks' => $employee->latestSubmission?->rejection_reason,
                    'currentTargetStatus' => $currentTarget?->status,
                ];
            });

        $currentPeriodOpen = SystemSetting::get('ipcr_period_open', false);

        return Inertia::render('performance-evaluation', [
            'roleView' => 'evaluator',
            'currentPeriod' => [
                'label' => $currentPeriodLabel,
                'year' => $currentPeriodYear,
                'isOpen' => $currentPeriodOpen,
            ],
            'evaluatorPanel' => [
                'search' => $search,
                'statusFilter' => $statusFilter,
                'stageFilter' => $stageFilter,
                'periodOpen' => $currentPeriodOpen,
                'employees' => $employees->items(),
                'pagination' => [
                    'currentPage' => $employees->currentPage(),
                    'lastPage' => $employees->lastPage(),
                    'perPage' => $employees->perPage(),
                    'total' => $employees->total(),
                ],
                'stats' => [
                    'trackedEmployees' => count($employeeIds),
                    'submitted' => Employee::query()->whereIn('employee_id', $employeeIds)->whereHas('latestSubmission')->count(),
                    'pendingEvaluation' => Employee::query()->whereIn('employee_id', $employeeIds)->whereHas('latestSubmission', fn ($query) => $query->where('stage', 'sent_to_evaluator'))->count(),
                    'routedToHr' => Employee::query()->whereIn('employee_id', $employeeIds)->whereHas('latestSubmission', fn ($query) => $query->where('stage', 'sent_to_hr'))->count(),
                ],
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
            'period' => 'period',
            'quarter' => 'quarter',
            'attendance_punctuality_rate' => 'attendance_punctuality_rate',
            'absenteeism_days' => 'absenteeism_days',
            'tardiness_incidents' => 'tardiness_incidents',
            'training_completion_status' => 'training_completion_status',
            'evaluated_performance_score' => 'evaluated_performance_score',
        ];
        ['sort' => $sort, 'direction' => $direction] = $this->resolveSort($request, $allowedSorts, 'year', 'asc');
        if ($sort === 'quarter') {
            $sort = 'period';
        }

        $historicalData = HistoricalDataRecord::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('employee_name', 'like', '%'.$search.'%')
                        ->orWhere('department_name', 'like', '%'.$search.'%')
                        ->orWhere('year', 'like', '%'.$search.'%')
                        ->orWhere('period', 'like', '%'.$search.'%')
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
            ->when($sort === 'period', function ($query) use ($direction): void {
                $query->orderByRaw(
                    "CASE COALESCE(NULLIF(period, ''), quarter)
                        WHEN 'S1' THEN 1
                        WHEN 'Q1' THEN 1
                        WHEN 'Q2' THEN 1
                        WHEN 'S2' THEN 2
                        WHEN 'Q3' THEN 2
                        WHEN 'Q4' THEN 2
                        ELSE 3
                    END {$direction}"
                );
            }, function ($query): void {
                $query->orderByRaw(
                    "CASE COALESCE(NULLIF(period, ''), quarter)
                        WHEN 'S1' THEN 1
                        WHEN 'Q1' THEN 1
                        WHEN 'Q2' THEN 1
                        WHEN 'S2' THEN 2
                        WHEN 'Q3' THEN 2
                        WHEN 'Q4' THEN 2
                        ELSE 3
                    END ASC"
                );
            })
            ->when(
                ! in_array($sort, ['employee_name', 'department_name', 'year', 'period'], true),
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
                'period' => $historicalDataRecord->resolvedPeriod(),
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
