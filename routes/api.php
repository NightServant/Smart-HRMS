<?php

use App\Http\Controllers\Api\BiometricController;
use App\Http\Controllers\Api\BiometricWebhookController;
use Illuminate\Support\Facades\Route;

// Public webhook entrypoint. Auth is handled inside the controller via signature
// verification; cannot be authenticated against our session/sanctum guards because
// Zlink calls it from outside.
Route::middleware('throttle:120,1')->prefix('biometrics/webhook')->group(function (): void {
    Route::get('zlink', [BiometricWebhookController::class, 'verify'])->name('api.biometrics.webhook.verify');
    Route::post('zlink', [BiometricWebhookController::class, 'receive'])->name('api.biometrics.webhook.receive');
});

Route::middleware(['web', 'auth', 'throttle:60,1'])->prefix('biometrics')->group(function (): void {
    Route::post('enroll', [BiometricController::class, 'enroll'])
        ->middleware('role:hr-personnel')
        ->name('api.biometrics.enroll');
    Route::post('self-enroll', [BiometricController::class, 'selfEnroll'])
        ->middleware('role:employee')
        ->name('api.biometrics.self-enroll');
    Route::get('enrollment-status', [BiometricController::class, 'enrollmentStatus'])
        ->middleware('role:employee')
        ->name('api.biometrics.enrollment-status');
    Route::get('departments', [BiometricController::class, 'departments'])
        ->name('api.biometrics.departments');
    Route::get('attendance/{employee:employee_id}', [BiometricController::class, 'attendance'])
        ->name('api.biometrics.attendance');
    Route::post('clock', [BiometricController::class, 'clock'])
        ->middleware('role:employee')
        ->name('api.biometrics.clock');
});
