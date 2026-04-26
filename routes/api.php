<?php

use App\Http\Controllers\Api\BiometricController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'throttle:60,1'])->prefix('biometrics')->group(function (): void {
    Route::post('sync', [BiometricController::class, 'sync'])
        ->middleware('role:administrator')
        ->name('api.biometrics.sync');
    Route::post('enroll', [BiometricController::class, 'enroll'])
        ->middleware('role:administrator,hr-personnel')
        ->name('api.biometrics.enroll');
    Route::post('self-enroll', [BiometricController::class, 'selfEnroll'])
        ->middleware('role:employee')
        ->name('api.biometrics.self-enroll');
    Route::get('enrollment-status', [BiometricController::class, 'enrollmentStatus'])
        ->middleware('role:employee')
        ->name('api.biometrics.enrollment-status');
    Route::get('terminals', [BiometricController::class, 'terminals'])
        ->name('api.biometrics.terminals');
    Route::get('attendance/{employee:employee_id}', [BiometricController::class, 'attendance'])
        ->name('api.biometrics.attendance');
});
