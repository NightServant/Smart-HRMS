<?php

use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('attendance management supports page and per page query parameters', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.attendance-management', ['perPage' => 5, 'page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/attendance-management')
            ->has('attendances', 0)
            ->where('pagination.currentPage', 2)
            ->where('pagination.perPage', 5)
            ->where('pagination.lastPage', 1)
            ->where('pagination.total', 0));
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
