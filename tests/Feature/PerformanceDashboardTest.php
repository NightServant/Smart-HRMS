<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('evaluator performance dashboard no longer exposes seminars data', function () {
    $user = User::factory()->asEvaluator()->create();

    $this->actingAs($user)
        ->get(route('performanceDashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performanceDashboard')
            ->has('remarks')
            ->has('leaveOverview')
            ->missing('seminars'));
});

test('hr performance dashboard no longer exposes seminars data', function () {
    $user = User::factory()->asHrPersonnel()->create();

    $this->actingAs($user)
        ->get(route('admin.performance-dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/performance-dashboard')
            ->has('remarks')
            ->has('leaveOverview')
            ->missing('seminars'));
});
