<?php

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

test('hr personnel can open admin historical data page', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hrUser)
        ->get(route('admin.historical-data'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/historical-data')
            ->has('historicalData')
            ->has('pagination')
            ->has('search'));
});
