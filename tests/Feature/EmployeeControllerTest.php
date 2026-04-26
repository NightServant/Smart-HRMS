<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\User;
use App\Notifications\EmployeeAccountCredentialsNotification;
use Illuminate\Support\Facades\Notification;
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
    User::factory()->asPmt()->create([
        'name' => 'PMT User',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 2)
            ->where('employees.0.role', User::ROLE_EMPLOYEE)
            ->where('employees.1.role', User::ROLE_EMPLOYEE)
            ->has('operationalAccounts', 3)
            ->where('operationalAccounts', fn ($accounts): bool => collect($accounts)
                ->pluck('role')
                ->sort()
                ->values()
                ->all() === [
                    User::ROLE_EVALUATOR,
                    User::ROLE_HR_PERSONNEL,
                    User::ROLE_PMT,
                ]));
});

test('evaluator employee directory stays employee only', function () {
    User::factory()->create([
        'name' => 'Employee One',
    ]);
    User::factory()->asPmt()->create([
        'name' => 'PMT User',
    ]);

    $evaluator = User::factory()->asEvaluator()->create();

    $this->actingAs($evaluator)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 1)
            ->missing('operationalAccounts')
            ->missing('operationalRoles')
            ->missing('accountRoles'));
});

test('employee directory exposes the employee date hired field', function () {
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $position = EmployeePosition::query()->create(['name' => 'Administrative Aide']);

    Employee::query()->create([
        'employee_id' => 'EMP-100',
        'name' => 'Employee One',
        'job_title' => 'Administrative Aide',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-20',
    ]);

    User::factory()->create([
        'name' => 'Employee One',
        'employee_id' => 'EMP-100',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->where('employees.0.date_hired', '2024-05-20')
            ->where('employees.0.account_is_active', true)
            ->where('employees.0.account_two_factor_enabled', false));
});

test('hr personnel can add an employee with an inline new department and credentials', function () {
    Notification::fake();

    $hrUser = User::factory()->asHrPersonnel()->create();
    $position = EmployeePosition::query()->create([
        'name' => 'Administrative Aide I',
    ]);

    $response = $this->actingAs($hrUser)
        ->post(route('admin.employee-directory.store'), [
            'name' => 'New Employee',
            'email' => 'new.employee@example.com',
            'department_mode' => 'new',
            'department_id' => '',
            'department_name' => 'Planning Office',
            'position_id' => $position->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-01',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('employeeAccountCredentials', function (array $credentials): bool {
        return $credentials['employeeName'] === 'New Employee'
            && $credentials['employeeId'] === 'EMP-001'
            && $credentials['email'] === 'new.employee@example.com'
            && filled($credentials['temporaryPassword']);
    });

    $department = Department::query()->where('name', 'Planning Office')->first();
    $employee = Employee::query()->where('name', 'New Employee')->first();
    $user = User::query()->where('email', 'new.employee@example.com')->first();

    expect($department)->not->toBeNull();
    expect($employee)->not->toBeNull();
    expect($user)->not->toBeNull();
    expect($employee?->employee_id)->toBe('EMP-001');
    expect($employee?->department_id)->toBe($department?->id);
    expect($employee?->position_id)->toBe($position->id);
    expect($employee?->job_title)->toBe('Administrative Aide I');
    expect($user?->employee_id)->toBe('EMP-001');
    expect($user?->must_change_password)->toBeTrue();
    expect($user?->role)->toBe(User::ROLE_EMPLOYEE);

    Notification::assertSentTo(
        $user,
        EmployeeAccountCredentialsNotification::class,
    );
});

test('updating an employee recreates a missing linked account', function () {
    Notification::fake();

    $hrUser = User::factory()->asHrPersonnel()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $position = EmployeePosition::query()->create([
        'name' => 'Project Development Officer',
    ]);

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-200',
        'name' => 'Unlinked Employee',
        'job_title' => 'Project Development Officer',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2026-04-10',
    ]);

    $this->actingAs($hrUser)
        ->put(route('admin.employee-directory.update', $employee), [
            'name' => 'Unlinked Employee',
            'email' => 'unlinked.employee@example.com',
            'department_mode' => 'existing',
            'department_id' => $department->id,
            'department_name' => '',
            'position_id' => $position->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-10',
            'zkteco_pin' => '',
        ])
        ->assertRedirect()
        ->assertSessionHas('employeeAccountCredentials', function (array $credentials): bool {
            return $credentials['employeeName'] === 'Unlinked Employee'
                && $credentials['employeeId'] === 'EMP-200'
                && $credentials['email'] === 'unlinked.employee@example.com'
                && filled($credentials['temporaryPassword']);
        });

    $user = User::query()->where('employee_id', 'EMP-200')->first();

    expect($user)->not->toBeNull();
    expect($user?->role)->toBe(User::ROLE_EMPLOYEE);
    expect($user?->must_change_password)->toBeTrue();

    Notification::assertSentTo(
        $user,
        EmployeeAccountCredentialsNotification::class,
    );
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
