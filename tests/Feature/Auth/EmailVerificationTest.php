<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

test('email verification routes are disabled', function () {
    expect(Route::has('verification.notice'))->toBeFalse();
    expect(Route::has('verification.verify'))->toBeFalse();
});

test('unverified users can access their dashboard', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();
});

test('unverified administrators can access the system dashboard', function () {
    $user = User::factory()->asAdministrator()->unverified()->create();

    $this->actingAs($user)
        ->get(route('admin.system-dashboard'))
        ->assertOk();
});
