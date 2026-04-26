<?php

use Illuminate\Support\Facades\Route;

test('system dashboard route is no longer registered', function () {
    expect(Route::has('admin.system-dashboard'))->toBeFalse();
});

test('system dashboard route stays removed regardless of available dashboard data', function () {
    expect(Route::has('admin.system-dashboard'))->toBeFalse();
});
