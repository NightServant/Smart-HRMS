<?php

use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('administrator can view all account roles in user management', function () {
    $admin = User::factory()->asAdministrator()->create(['name' => 'Admin User']);
    User::factory()->create(['name' => 'Employee User']);
    User::factory()->asEvaluator()->create(['name' => 'Evaluator User']);
    User::factory()->asHrPersonnel()->create(['name' => 'HR User']);

    $this->actingAs($admin)
        ->get(route('admin.user-management'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/user-management')
            ->has('users', 4)
            ->where('users.0.role', User::ROLE_ADMINISTRATOR)
            ->missing('users.0.id')
            ->missing('users.0.links.passwordReset'));
});

test('administrator can create user accounts', function () {
    Notification::fake();

    $admin = User::factory()->asAdministrator()->create();

    $this->actingAs($admin)
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

test('administrator cannot deactivate own account', function () {
    $admin = User::factory()->asAdministrator()->create();

    $response = $this->actingAs($admin)
        ->from(route('admin.user-management'))
        ->post(route('admin.user-management.deactivate', $admin));

    $response->assertRedirect(route('admin.user-management'));
    $response->assertSessionHasErrors('is_active');
    expect($admin->fresh()->is_active)->toBeTrue();
});

test('system cannot lose its last active administrator', function () {
    $admin = User::factory()->asAdministrator()->create();

    $response = $this->actingAs($admin)
        ->from(route('admin.user-management'))
        ->put(route('admin.user-management.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => User::ROLE_EMPLOYEE,
            'employee_id' => '',
            'password' => '',
            'password_confirmation' => '',
            'is_active' => true,
        ]);

    $response->assertRedirect(route('admin.user-management'));
    $response->assertSessionHasErrors('role');
    expect($admin->fresh()->role)->toBe(User::ROLE_ADMINISTRATOR);
});
