<?php

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\LeaveRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('attendance management supports page and per page query parameters', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.attendance-management', ['perPage' => 5, 'page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/attendance-management')
            ->has('attendances', 0)
            ->has('stats')
            ->where('pagination.currentPage', 2)
            ->where('pagination.perPage', 5)
            ->where('pagination.lastPage', 1)
            ->where('pagination.total', 0));
});

test('attendance management exposes summary counts for hr stat cards', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    Employee::query()->create([
        'employee_id' => 'EMP-301',
        'name' => 'Alpha Employee',
        'job_title' => 'Analyst',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-302',
        'name' => 'Bravo Employee',
        'job_title' => 'Officer',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-303',
        'name' => 'Charlie Employee',
        'job_title' => 'Assistant',
    ]);

    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-301',
        'date' => '2026-04-01',
        'punch_time' => '2026-04-01 08:00:00',
        'status' => 'Present',
        'source' => 'biometric',
    ]);
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-302',
        'date' => '2026-04-01',
        'punch_time' => '2026-04-01 08:15:00',
        'status' => 'Late',
        'source' => 'manual',
    ]);
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-303',
        'date' => '2026-04-01',
        'punch_time' => '2026-04-01 09:00:00',
        'status' => 'Absent',
        'source' => 'import',
    ]);

    $this->actingAs($hrUser)
        ->get(route('admin.attendance-management'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/attendance-management')
            ->where('stats.totalRecords', 3)
            ->where('stats.presentCount', 1)
            ->where('stats.lateCount', 1)
            ->where('stats.absentCount', 1)
            ->where('stats.biometricCount', 1)
            ->where('stats.manualCount', 1)
            ->where('stats.importCount', 1));
});

test('evaluator attendance page exposes subordinate manual punch settings', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-300',
        'name' => 'Evaluator Lead',
        'job_title' => 'Supervisor',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-SUB-300',
        'name' => 'Field Employee',
        'job_title' => 'Field Officer',
        'supervisor_id' => 'EMP-EVAL-300',
        'manual_punch_enabled' => true,
        'manual_punch_reason' => 'Field validation visit',
        'manual_punch_start_date' => '2026-04-01',
        'manual_punch_end_date' => '2026-04-05',
    ]);

    $evaluatorUser = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-EVAL-300',
    ]);

    $this->actingAs($evaluatorUser)
        ->get(route('admin.evaluator-attendance'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/evaluator-attendance')
            ->where('stats.totalRecords', 0)
            ->has('subordinates', 1)
            ->where('subordinates.0.employee_id', 'EMP-SUB-300')
            ->where('subordinates.0.name', 'Field Employee')
            ->where('subordinates.0.manual_punch_enabled', true)
            ->where('subordinates.0.manual_punch_reason', 'Field validation visit')
            ->where('subordinates.0.manual_punch_start_date', '2026-04-01')
            ->where('subordinates.0.manual_punch_end_date', '2026-04-05'));
});

test('employee directory supports page and per page query parameters', function () {
    User::factory()->count(6)->create();
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory', ['perPage' => 3, 'page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 3)
            ->where('pagination.currentPage', 2)
            ->where('pagination.perPage', 3)
            ->where('pagination.lastPage', 2)
            ->where('pagination.total', 6));
});

test('leave management filters records by leave type status and stage', function () {
    $evaluatorUser = User::factory()->asEvaluator()->create();

    $pendingEmployee = User::factory()->create([
        'name' => 'Pending Evaluator Employee',
        'email' => 'pending-evaluator@example.com',
    ]);
    $approvedEmployee = User::factory()->create([
        'name' => 'Approved Evaluator Employee',
        'email' => 'approved-evaluator@example.com',
    ]);
    $returnedEmployee = User::factory()->create([
        'name' => 'Returned Evaluator Employee',
        'email' => 'returned-evaluator@example.com',
    ]);

    LeaveRequest::query()->create([
        'user_id' => $pendingEmployee->id,
        'leave_type' => 'vacation-leave',
        'start_date' => '2026-04-10',
        'end_date' => '2026-04-12',
        'reason' => 'Family travel.',
        'status' => 'routed',
        'stage' => 'sent_to_department_head',
        'days_requested' => 3,
    ]);

    LeaveRequest::query()->create([
        'user_id' => $approvedEmployee->id,
        'leave_type' => 'sick-leave',
        'start_date' => '2026-04-15',
        'end_date' => '2026-04-16',
        'reason' => 'Recovering at home.',
        'status' => 'completed',
        'stage' => 'completed',
        'dh_decision' => 1,
        'hr_decision' => 1,
        'days_requested' => 2,
    ]);

    LeaveRequest::query()->create([
        'user_id' => $returnedEmployee->id,
        'leave_type' => 'emergency-leave',
        'start_date' => '2026-04-20',
        'end_date' => '2026-04-20',
        'reason' => 'Urgent family matter.',
        'status' => 'returned',
        'stage' => 'sent_to_department_head',
        'dh_decision' => 2,
        'days_requested' => 1,
    ]);

    $this->actingAs($evaluatorUser)
        ->get(route('admin.leave-management', [
            'leaveTypeFilter' => 'sick-leave',
            'statusFilter' => 'completed',
            'stageFilter' => 'completed',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/leave-management')
            ->where('leaveTypeFilter', 'sick-leave')
            ->where('statusFilter', 'completed')
            ->where('stageFilter', 'completed')
            ->where('leaveTypeOptions', ['emergency-leave', 'sick-leave', 'vacation-leave'])
            ->where('statusOptions', ['completed', 'returned', 'routed'])
            ->where('stageOptions', ['completed', 'sent_to_department_head'])
            ->has('leaveRequests', 1)
            ->where('leaveRequests.0.name', 'Approved Evaluator Employee')
            ->where('leaveRequests.0.leaveType', 'sick-leave')
            ->where('leaveRequests.0.status', 'completed')
            ->where('leaveRequests.0.leaveAccrual', fn ($value) => (float) $value === 2.0));
});

test('leave management normalizes rejected records as returned', function () {
    $evaluatorUser = User::factory()->asEvaluator()->create();

    $employee = User::factory()->create([
        'name' => 'Returned Status Employee',
        'email' => 'returned-status@example.com',
    ]);

    LeaveRequest::query()->create([
        'user_id' => $employee->id,
        'leave_type' => 'vacation-leave',
        'start_date' => '2026-04-10',
        'end_date' => '2026-04-12',
        'reason' => 'Personal reasons.',
        'status' => 'completed',
        'stage' => 'completed',
        'dh_decision' => 2,
        'hr_decision' => 0,
        'days_requested' => 3,
        'has_rejection_reason' => 1,
        'rejection_reason_text' => 'Please revise the dates.',
    ]);

    $this->actingAs($evaluatorUser)
        ->get(route('admin.leave-management'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/leave-management')
            ->where('leaveRequests.0.status', 'returned')
            ->where('stats.returnedByDh', 1));
});

test('hr leave management filters records by leave type status and stage', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $pendingEmployee = User::factory()->create([
        'name' => 'Pending HR Employee',
        'email' => 'pending-hr@example.com',
    ]);
    $completedEmployee = User::factory()->create([
        'name' => 'Completed HR Employee',
        'email' => 'completed-hr@example.com',
    ]);
    $returnedEmployee = User::factory()->create([
        'name' => 'Returned HR Employee',
        'email' => 'returned-hr@example.com',
    ]);

    LeaveRequest::query()->create([
        'user_id' => $pendingEmployee->id,
        'leave_type' => 'force-leave',
        'start_date' => '2026-05-02',
        'end_date' => '2026-05-04',
        'reason' => 'Annual force leave.',
        'status' => 'routed',
        'stage' => 'sent_to_hr',
        'dh_decision' => 1,
        'days_requested' => 3,
    ]);

    LeaveRequest::query()->create([
        'user_id' => $completedEmployee->id,
        'leave_type' => 'maternity-leave',
        'start_date' => '2026-05-10',
        'end_date' => '2026-05-20',
        'reason' => 'Maternity leave.',
        'status' => 'completed',
        'stage' => 'completed',
        'dh_decision' => 1,
        'hr_decision' => 1,
        'days_requested' => 11,
    ]);

    LeaveRequest::query()->create([
        'user_id' => $returnedEmployee->id,
        'leave_type' => 'sick-leave',
        'start_date' => '2026-05-22',
        'end_date' => '2026-05-23',
        'reason' => 'Medical recovery.',
        'status' => 'returned',
        'stage' => 'sent_to_hr',
        'dh_decision' => 1,
        'hr_decision' => 2,
        'days_requested' => 2,
    ]);

    $this->actingAs($hrUser)
        ->get(route('admin.hr-leave-management', [
            'leaveTypeFilter' => 'force-leave',
            'statusFilter' => 'routed',
            'stageFilter' => 'sent_to_hr',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/hr-leave-management')
            ->where('leaveTypeFilter', 'force-leave')
            ->where('statusFilter', 'routed')
            ->where('stageFilter', 'sent_to_hr')
            ->where('leaveTypeOptions', ['force-leave', 'maternity-leave', 'sick-leave'])
            ->where('statusOptions', ['completed', 'returned', 'routed'])
            ->where('stageOptions', ['completed', 'sent_to_hr'])
            ->has('leaveRequests', 1)
            ->where('leaveRequests.0.name', 'Pending HR Employee')
            ->where('leaveRequests.0.leaveType', 'force-leave')
            ->where('leaveRequests.0.status', 'routed')
            ->where('leaveRequests.0.leaveAccrual', fn ($value) => (float) $value === 3.0));
});

test('employee directory sorts records using requested column and direction', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Bravo Employee',
        'job_title' => 'Analyst',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'Alpha Employee',
        'job_title' => 'Assistant',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-003',
        'name' => 'Charlie Employee',
        'job_title' => 'Manager',
    ]);

    User::factory()->create([
        'name' => 'Bravo Employee',
        'email' => 'bravo@example.com',
        'employee_id' => 'EMP-002',
    ]);
    User::factory()->create([
        'name' => 'Alpha Employee',
        'email' => 'alpha@example.com',
        'employee_id' => 'EMP-001',
    ]);
    User::factory()->create([
        'name' => 'Charlie Employee',
        'email' => 'charlie@example.com',
        'employee_id' => 'EMP-003',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory', ['sort' => 'name', 'direction' => 'desc']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->where('sort', 'name')
            ->where('direction', 'desc')
            ->where('employees.0.name', 'Charlie Employee')
            ->where('employees.1.name', 'Bravo Employee')
            ->where('employees.2.name', 'Alpha Employee'));
});

test('hr personnel can update employee employment status from the directory', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-010',
        'name' => 'Sample Employee',
        'job_title' => 'Administrative Aide',
        'employment_status' => 'regular',
    ]);

    User::factory()->create([
        'name' => 'Sample Employee',
        'email' => 'sample-employee@example.com',
        'employee_id' => 'EMP-010',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->patch(route('admin.employee-directory.employment-status', ['employee' => 'EMP-010']), [
            'employment_status' => 'casual',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-010',
        'employment_status' => 'casual',
    ]);

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory', ['statusFilter' => 'casual']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->where('stats.casual', 1)
            ->where('employees.0.employment_status', 'casual'));
});

test('evaluators cannot update employee employment status from the directory', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-011',
        'name' => 'Restricted Employee',
        'job_title' => 'Administrative Aide',
        'employment_status' => 'regular',
    ]);

    $evaluator = User::factory()->asEvaluator()->create();

    $this->actingAs($evaluator)
        ->patch(route('admin.employee-directory.employment-status', ['employee' => 'EMP-011']), [
            'employment_status' => 'job_order',
        ])
        ->assertForbidden();
});

test('hr personnel can open admin historical data page', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.historical-data'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/historical-data')
            ->has('historicalData')
            ->has('pagination')
            ->has('search')
            ->where('sort', 'year')
            ->where('direction', 'asc'));
});

test('historical data sorts records using requested column and direction', function () {
    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alex Employee',
        'department_name' => 'Support',
        'year' => 2024,
        'quarter' => 'Q1',
        'attendance_punctuality_rate' => '93%',
        'absenteeism_days' => 4,
        'tardiness_incidents' => 2,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 88.40,
    ]);

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Bianca Employee',
        'department_name' => 'Operations',
        'year' => 2026,
        'quarter' => 'Q3',
        'attendance_punctuality_rate' => '98%',
        'absenteeism_days' => 1,
        'tardiness_incidents' => 0,
        'training_completion_status' => 3,
        'evaluated_performance_score' => 96.10,
    ]);

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Carlos Employee',
        'department_name' => 'Admin',
        'year' => 2025,
        'quarter' => 'Q2',
        'attendance_punctuality_rate' => '95%',
        'absenteeism_days' => 2,
        'tardiness_incidents' => 1,
        'training_completion_status' => 2,
        'evaluated_performance_score' => 91.75,
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.historical-data', ['sort' => 'year', 'direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/historical-data')
            ->where('sort', 'year')
            ->where('direction', 'asc')
            ->where('historicalData.0.year', 2024)
            ->where('historicalData.0.employeeName', 'Alex Employee')
            ->where('historicalData.1.year', 2026)
            ->where('historicalData.1.employeeName', 'Bianca Employee')
            ->where('historicalData.2.year', 2025)
            ->where('historicalData.2.employeeName', 'Carlos Employee'));
});

test('historical data exposes semester values and sorts semestral records', function () {
    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alex Employee',
        'department_name' => 'Support',
        'year' => 2026,
        'quarter' => 'Q3',
        'period' => 'S2',
        'attendance_punctuality_rate' => '96%',
        'absenteeism_days' => 1,
        'tardiness_incidents' => 1,
        'training_completion_status' => 2,
        'evaluated_performance_score' => 91.40,
    ]);

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alex Employee',
        'department_name' => 'Support',
        'year' => 2026,
        'quarter' => 'Q1',
        'period' => 'S1',
        'attendance_punctuality_rate' => '94%',
        'absenteeism_days' => 2,
        'tardiness_incidents' => 0,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 89.25,
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.historical-data', ['sort' => 'period', 'direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/historical-data')
            ->where('sort', 'period')
            ->where('direction', 'asc')
            ->where('historicalData.0.period', 'S1')
            ->where('historicalData.1.period', 'S2'));
});
