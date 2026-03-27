<?php

use App\Models\Employee;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed for administrators with editable profile props', function () {
    $user = User::factory()->asAdministrator()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('canEditProfile', true)
            ->where('accountProfile.role', User::ROLE_ADMINISTRATOR)
            ->where('employeeProfile', null));
});

test('employee profile page includes linked employee data as read only props', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'Supervisor Record',
        'job_title' => 'Department Head',
        'supervisor_id' => null,
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-200',
        'name' => 'Employee Record',
        'job_title' => 'Administrative Officer II',
        'supervisor_id' => 'EMP-001',
    ]);

    $user = User::factory()->create([
        'role' => User::ROLE_EMPLOYEE,
        'employee_id' => 'EMP-200',
    ]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('canEditProfile', false)
            ->where('accountProfile.role', User::ROLE_EMPLOYEE)
            ->where('employeeProfile.employee_id', 'EMP-200')
            ->where('employeeProfile.job_title', 'Administrative Officer II')
            ->where('employeeProfile.supervisor_id', 'EMP-001'));
});

test('evaluator profile page includes linked employee data as read only props', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-300',
        'name' => 'Evaluator Record',
        'job_title' => 'Department Head',
        'supervisor_id' => null,
    ]);

    $user = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-300',
    ]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('canEditProfile', false)
            ->where('accountProfile.role', User::ROLE_EVALUATOR)
            ->where('employeeProfile.employee_id', 'EMP-300')
            ->where('employeeProfile.name', 'Evaluator Record'));
});

test('employee profile page safely returns no employee profile when no employee record is linked', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_EMPLOYEE,
        'employee_id' => null,
    ]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('canEditProfile', false)
            ->where('employeeProfile', null));
});

test('administrator profile information can be updated', function () {
    $user = User::factory()->asAdministrator()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Admin User',
            'email' => 'admin.updated@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Admin User');
    expect($user->email)->toBe('admin.updated@example.com');
    expect($user->email_verified_at)->not->toBeNull();
});

test('non administrator roles cannot update profile information', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
    ]);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Blocked User',
            'email' => 'blocked@example.com',
        ])
        ->assertForbidden();

    expect($user->fresh()->name)->not->toBe('Blocked User');
    expect($user->fresh()->email)->not->toBe('blocked@example.com');
})->with([
    User::ROLE_EMPLOYEE,
    User::ROLE_EVALUATOR,
    User::ROLE_HR_PERSONNEL,
]);

test('administrator email verification status is unchanged when the email address changes', function () {
    $user = User::factory()->asAdministrator()->create();
    $originalVerificationTimestamp = $user->email_verified_at;

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Admin User',
            'email' => 'admin.changed@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at?->toISOString())->toBe($originalVerificationTimestamp?->toISOString());
});

test('delete account endpoint is forbidden for all roles', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
    ]);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ])
        ->assertForbidden();

    expect($user->fresh())->not->toBeNull();
})->with([
    User::ROLE_ADMINISTRATOR,
    User::ROLE_EMPLOYEE,
    User::ROLE_EVALUATOR,
    User::ROLE_HR_PERSONNEL,
]);
