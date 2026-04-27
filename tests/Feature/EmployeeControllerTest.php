<?php

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\User;
use App\Notifications\EmployeeAccountCredentialsNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('employee directory returns linked employee records in ascending employee id order', function () {
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $pmtDepartment = Department::query()->firstOrCreate(['name' => 'Performance Management Team']);
    $position = EmployeePosition::query()->create(['name' => 'Administrative Aide']);
    $representativePosition = EmployeePosition::query()->create(['name' => 'Representative']);

    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Employee One',
        'job_title' => 'Administrative Aide',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-20',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-003',
        'name' => 'Employee Two',
        'job_title' => 'Administrative Aide',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-21',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'John Reyes',
        'job_title' => 'Department Head',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-19',
    ]);
    Employee::query()->create([
        'employee_id' => 'PMT-001',
        'name' => 'Mark Reyes',
        'job_title' => 'Representative',
        'department_id' => $pmtDepartment->id,
        'position_id' => $representativePosition->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-06-01',
    ]);

    User::factory()->create([
        'name' => 'Employee One',
        'employee_id' => 'EMP-002',
    ]);
    User::factory()->create([
        'name' => 'Employee Two',
        'employee_id' => 'EMP-003',
    ]);
    User::factory()->asEvaluator()->create([
        'name' => 'John Reyes',
        'employee_id' => 'EMP-001',
    ]);
    User::factory()->asPmt()->create([
        'name' => 'Mark Reyes',
        'employee_id' => 'PMT-001',
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 4)
            ->where('employees.0.employee_id', 'EMP-001')
            ->where('employees.0.role', User::ROLE_EVALUATOR)
            ->where('employees.0.predictive_evaluation_enabled', false)
            ->where('employees.1.employee_id', 'EMP-002')
            ->where('employees.1.role', User::ROLE_EMPLOYEE)
            ->where('employees.2.employee_id', 'EMP-003')
            ->where('employees.3.employee_id', 'PMT-001')
            ->where('employees.3.role', User::ROLE_PMT)
            ->where('employees.3.department', 'Performance Management Team')
            ->where('employees.3.position', 'Representative')
            ->where('employees.3.predictive_evaluation_enabled', false)
            ->missing('operationalAccounts')
            ->missing('operationalRoles'));
});

test('evaluator employee directory stays linked employee only', function () {
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $pmtDepartment = Department::query()->firstOrCreate(['name' => 'Performance Management Team']);
    $position = EmployeePosition::query()->create(['name' => 'Administrative Aide']);
    $representativePosition = EmployeePosition::query()->create(['name' => 'Representative']);

    Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'John Reyes',
        'job_title' => 'Department Head',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-19',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Employee One',
        'job_title' => 'Administrative Aide',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-05-20',
    ]);
    Employee::query()->create([
        'employee_id' => 'PMT-001',
        'name' => 'Mark Reyes',
        'job_title' => 'Representative',
        'department_id' => $pmtDepartment->id,
        'position_id' => $representativePosition->id,
        'employment_status' => 'regular',
        'date_hired' => '2024-06-01',
    ]);

    User::factory()->create([
        'name' => 'Employee One',
        'employee_id' => 'EMP-002',
    ]);
    User::factory()->asPmt()->create([
        'name' => 'Mark Reyes',
        'employee_id' => 'PMT-001',
    ]);
    $evaluator = User::factory()->asEvaluator()->create([
        'name' => 'John Reyes',
        'employee_id' => 'EMP-001',
    ]);

    $this->actingAs($evaluator)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees', 1)
            ->where('employees.0.employee_id', 'EMP-002')
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

test('creating an employee ignores spoofed role input and derives the linked role from position', function () {
    Notification::fake();

    $hrUser = User::factory()->asHrPersonnel()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $position = EmployeePosition::query()->create([
        'name' => 'Department Head',
    ]);

    $this->actingAs($hrUser)
        ->post(route('admin.employee-directory.store'), [
            'name' => 'Derived Role Employee',
            'email' => 'derived.role@example.com',
            'department_mode' => 'existing',
            'department_id' => $department->id,
            'department_name' => '',
            'position_id' => $position->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-02',
            'role' => User::ROLE_PMT,
        ])
        ->assertRedirect();

    $user = User::query()->where('email', 'derived.role@example.com')->first();

    expect($user)->not->toBeNull();
    expect($user?->role)->toBe(User::ROLE_EVALUATOR);
});

test('representative positions derive the PMT linked account role', function () {
    Notification::fake();

    $hrUser = User::factory()->asHrPersonnel()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Performance Management Team']);
    $position = EmployeePosition::query()->create([
        'name' => 'Representative',
    ]);

    $this->actingAs($hrUser)
        ->post(route('admin.employee-directory.store'), [
            'name' => 'PMT Representative',
            'email' => 'pmt.representative@example.com',
            'department_mode' => 'existing',
            'department_id' => $department->id,
            'department_name' => '',
            'position_id' => $position->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-03',
            'role' => User::ROLE_EMPLOYEE,
        ])
        ->assertRedirect();

    $user = User::query()->where('email', 'pmt.representative@example.com')->first();

    expect($user)->not->toBeNull();
    expect($user?->role)->toBe(User::ROLE_PMT);
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
            'role' => User::ROLE_EMPLOYEE,
            'is_active' => true,
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

test('updating an employee derives linked account role from the selected position and keeps status updates', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $employeePosition = EmployeePosition::query()->create([
        'name' => 'Administrative Aide I',
    ]);
    $evaluatorPosition = EmployeePosition::query()->create([
        'name' => 'Department Head',
    ]);

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-210',
        'name' => 'John Linked',
        'job_title' => 'Administrative Aide I',
        'department_id' => $department->id,
        'position_id' => $employeePosition->id,
        'employment_status' => 'regular',
        'date_hired' => '2026-04-10',
    ]);

    $user = User::factory()->create([
        'name' => 'John Linked',
        'email' => 'john.linked@example.com',
        'employee_id' => 'EMP-210',
        'role' => User::ROLE_EMPLOYEE,
        'is_active' => true,
    ]);

    $this->actingAs($hrUser)
        ->put(route('admin.employee-directory.update', $employee), [
            'name' => 'John Linked',
            'email' => 'john.reyes@example.com',
            'department_mode' => 'existing',
            'department_id' => $department->id,
            'department_name' => '',
            'position_id' => $evaluatorPosition->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-10',
            'role' => User::ROLE_PMT,
            'is_active' => false,
            'zkteco_pin' => '',
        ])
        ->assertRedirect();

    expect($user->fresh()->role)->toBe(User::ROLE_EVALUATOR);
    expect($user->fresh()->is_active)->toBeFalse();
    expect($user->fresh()->email)->toBe('john.reyes@example.com');
    expect($employee->fresh()?->job_title)->toBe('Department Head');
});

test('positions outside the fixed mapping still default linked accounts to employee role', function () {
    Notification::fake();

    $hrUser = User::factory()->asHrPersonnel()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $position = EmployeePosition::query()->create([
        'name' => 'Project Development Officer',
    ]);

    $this->actingAs($hrUser)
        ->post(route('admin.employee-directory.store'), [
            'name' => 'Fallback Role Employee',
            'email' => 'fallback.role@example.com',
            'department_mode' => 'existing',
            'department_id' => $department->id,
            'department_name' => '',
            'position_id' => $position->id,
            'employment_status' => 'regular',
            'date_hired' => '2026-04-03',
        ])
        ->assertRedirect();

    $user = User::query()->where('email', 'fallback.role@example.com')->first();

    expect($user)->not->toBeNull();
    expect($user?->role)->toBe(User::ROLE_EMPLOYEE);
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
