<?php

use Illuminate\Support\Facades\Route;

test('verification notification route is disabled', function () {
    expect(Route::has('verification.send'))->toBeFalse();
});
