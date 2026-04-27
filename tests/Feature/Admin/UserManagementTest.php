<?php

use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\EmployeePositionSeeder;
use Database\Seeders\EmployeeSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('hr personnel can view all remaining account roles in user management', function () {
    $hr = User::factory()->asHrPersonnel()->create(['name' => 'HR Manager']);
    User::factory()->create(['name' => 'Employee User']);
    User::factory()->asEvaluator()->create(['name' => 'Evaluator User']);
    User::factory()->asPmt()->create(['name' => 'PMT User']);

    $this->actingAs($hr)
        ->get(route('admin.user-management'))
        ->assertRedirect(route('admin.employee-directory'));

    $this->actingAs($hr)
        ->get(route('admin.employee-directory'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/employee-directory')
            ->has('employees')
            ->missing('operationalAccounts')
            ->missing('operationalRoles'));
});

test('hr personnel can create user accounts', function () {
    Notification::fake();

    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)
        ->post(route('admin.user-management.store'), [
            'name' => 'Managed User',
            'email' => 'managed@example.com',
            'role' => User::ROLE_HR_PERSONNEL,
            'password' => 'password',
            'password_confirmation' => 'password',
            'is_active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'managed@example.com',
        'role' => User::ROLE_HR_PERSONNEL,
        'is_active' => true,
    ]);
});

test('hr personnel cannot create evaluator operational accounts', function () {
    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)
        ->from(route('admin.employee-directory'))
        ->post(route('admin.user-management.store'), [
            'name' => 'Rejected Evaluator',
            'email' => 'rejected.evaluator@example.com',
            'role' => User::ROLE_EVALUATOR,
            'password' => 'password',
            'password_confirmation' => 'password',
            'is_active' => true,
        ]);

    $response->assertRedirect(route('admin.employee-directory'));
    $response->assertSessionHasErrors('role');
    $this->assertDatabaseMissing('users', [
        'email' => 'rejected.evaluator@example.com',
    ]);
});

test('hr personnel cannot deactivate own account', function () {
    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)
        ->from(route('admin.employee-directory'))
        ->post(route('admin.user-management.deactivate', $hr));

    $response->assertRedirect(route('admin.employee-directory'));
    $response->assertSessionHasErrors('is_active');
    expect($hr->fresh()->is_active)->toBeTrue();
});

test('operational account updates keep the existing role even when a different role is submitted', function () {
    $hr = User::factory()->asHrPersonnel()->create();
    $pmt = User::factory()->asPmt()->create();

    $this->actingAs($hr)
        ->put(route('admin.user-management.update', $pmt), [
            'name' => 'PMT Updated',
            'email' => $pmt->email,
            'role' => User::ROLE_HR_PERSONNEL,
            'employee_id' => '',
            'password' => '',
            'password_confirmation' => '',
            'is_active' => true,
        ])
        ->assertRedirect();

    expect($pmt->fresh()->role)->toBe(User::ROLE_PMT);
    expect($pmt->fresh()->name)->toBe('PMT Updated');
});

test('user seeder keeps hr personnel and removes the old admin account', function () {
    $this->seed([
        DepartmentSeeder::class,
        EmployeePositionSeeder::class,
        EmployeeSeeder::class,
        UserSeeder::class,
    ]);

    $this->assertDatabaseHas('users', [
        'email' => 'grace.tan@shrms.test',
        'role' => User::ROLE_HR_PERSONNEL,
    ]);

    $this->assertDatabaseHas('users', [
        'email' => 'mark.reyes@shrms.test',
        'role' => User::ROLE_PMT,
        'employee_id' => 'PMT-001',
    ]);

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'PMT-001',
        'name' => 'Mark Reyes',
        'job_title' => 'Representative',
    ]);

    $this->assertDatabaseMissing('users', [
        'email' => 'admin@shrms.test',
    ]);
});
