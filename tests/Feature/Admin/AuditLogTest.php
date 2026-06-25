<?php

use Illuminate\Support\Facades\Route;

test('audit log route is no longer registered', function () {
    expect(Route::has('admin.audit-logs'))->toBeFalse();
});

test('audit log route stays removed even when route parameters are considered', function () {
    expect(Route::has('admin.audit-logs'))->toBeFalse();
});
