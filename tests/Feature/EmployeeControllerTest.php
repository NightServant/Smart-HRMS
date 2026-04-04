<?php

use App\Models\Employee;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('employee directory only returns users with employee role', function () {
    User::factory()->create([
        'name' => 'Employee One',
    ]);
    User::factory()->create([
        'name' => 'Employee Two',
    ]);
    User::factory()->asEvaluator()->create([
        'name' => 'Evaluator User',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 2)
            ->where('employees.0.role', User::ROLE_EMPLOYEE)
            ->where('employees.1.role', User::ROLE_EMPLOYEE));
});

test('document management only returns users with employee role', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Employee One',
        'job_title' => 'Administrative Aide',
        'employment_status' => 'regular',
    ]);
    User::factory()->create([
        'name' => 'Employee One',
        'employee_id' => 'EMP-002',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-003',
        'name' => 'Employee Two',
        'job_title' => 'Administrative Assistant',
        'employment_status' => 'regular',
    ]);
    User::factory()->create([
        'name' => 'Employee Two',
        'employee_id' => 'EMP-003',
    ]);
    User::factory()->asHrPersonnel()->create([
        'name' => 'HR User',
    ]);

    $evaluatorUser = User::factory()->asEvaluator()->create();

    $this->actingAs($evaluatorUser)
        ->get(route('document-management'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'evaluator')
            ->has('evaluatorPanel.employees', 2)
            ->where('evaluatorPanel.employees.0.role', User::ROLE_EMPLOYEE)
            ->where('evaluatorPanel.employees.1.role', User::ROLE_EMPLOYEE));
});
