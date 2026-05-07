<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('password update page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('user-password.edit'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/password'));
});

test('password can be updated', function () {
    $user = User::factory()->create([
        'must_change_password' => true,
    ]);

    $response = $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('user-password.edit'));

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
    expect($user->must_change_password)->toBeFalse();
});

test('password confirmation must match', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'password' => 'new-password',
            'password_confirmation' => 'different-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('user-password.edit'));
});

test('employee is not redirected to first-login prompt after password change', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_EMPLOYEE,
        'must_change_password' => true,
    ]);

    $this->actingAs($user)
        ->put(route('user-password.update'), [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->must_change_password)->toBeFalse();

    $this->actingAs($user->refresh())
        ->get(route('first-login-password-prompt'))
        ->assertRedirect(route($user->homeRouteName()));
});
