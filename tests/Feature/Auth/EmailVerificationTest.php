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

test('unverified hr personnel can access the hr dashboard', function () {
    $user = User::factory()->asHrPersonnel()->unverified()->create();

    $this->actingAs($user)
        ->get(route('admin.performance-dashboard'))
        ->assertOk();
});
