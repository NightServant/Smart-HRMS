<?php

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('attendance management returns no records by default', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.attendance-management', ['search' => 'Kevin']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/attendance-management')
            ->where('search', 'Kevin')
            ->has('attendances', 0));
});

test('leave management search filters records', function () {
    $evaluatorUser = User::factory()->asEvaluator()->create();
    $employeeUser = User::factory()->create([
        'name' => 'Pat Employee',
    ]);

    LeaveRequest::query()->create([
        'user_id' => $employeeUser->id,
        'leave_type' => 'paternity-leave',
        'start_date' => '2026-03-16',
        'end_date' => '2026-03-18',
        'reason' => 'Family support.',
    ]);

    $this->actingAs($evaluatorUser)
        ->get(route('admin.leave-management', ['search' => 'Paternity']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/leave-management')
            ->where('search', 'Paternity')
            ->has('leaveRequests', 1)
            ->where('leaveRequests.0.leaveType', 'paternity-leave'));
});

test('employee directory search returns employee users only', function () {
    User::factory()->create([
        'name' => 'Alice Employee',
        'email' => 'alice@example.com',
    ]);
    User::factory()->create([
        'name' => 'Brenda Employee',
        'email' => 'brenda@example.com',
    ]);
    User::factory()->asEvaluator()->create([
        'name' => 'Alice Evaluator',
        'email' => 'alice.evaluator@example.com',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory', ['search' => 'alice']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->where('search', 'alice')
            ->has('employees', 1)
            ->where('employees.0.name', 'Alice Employee')
            ->where('employees.0.role', User::ROLE_EMPLOYEE));
});

test('document management search returns employee users only', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Carol Employee',
        'job_title' => 'Administrative Aide',
        'employment_status' => 'regular',
    ]);
    User::factory()->create([
        'name' => 'Carol Employee',
        'email' => 'carol@example.com',
        'employee_id' => 'EMP-002',
    ]);
    User::factory()->asHrPersonnel()->create([
        'name' => 'Carol HR',
        'email' => 'carol.hr@example.com',
    ]);

    $evaluatorUser = User::factory()->asEvaluator()->create();

    $this->actingAs($evaluatorUser)
        ->get(route('document-management', ['search' => 'carol']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'evaluator')
            ->where('evaluatorPanel.search', 'carol')
            ->has('evaluatorPanel.employees', 1)
            ->where('evaluatorPanel.employees.0.name', 'Carol Employee')
            ->where('evaluatorPanel.employees.0.role', User::ROLE_EMPLOYEE));
});
