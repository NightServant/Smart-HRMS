<?php

use App\Http\Controllers\Api\BiometricController;
use App\Http\Controllers\Api\BiometricWebhookController;
use App\Http\Controllers\Api\WebAuthnController;
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
    Route::post('remote-enroll', [BiometricController::class, 'triggerRemoteEnrollment'])
        ->middleware('role:hr-personnel,employee')
        ->name('api.biometrics.remote-enroll');
    Route::delete('fingerprint', [BiometricController::class, 'deleteFingerprint'])
        ->middleware('role:hr-personnel,employee')
        ->name('api.biometrics.delete-fingerprint');

    Route::prefix('webauthn')->middleware('role:employee')->group(function (): void {
        Route::get('status', [WebAuthnController::class, 'status'])
            ->name('api.biometrics.webauthn.status');
        Route::post('register-options', [WebAuthnController::class, 'registerOptions'])
            ->name('api.biometrics.webauthn.register-options');
        Route::post('register', [WebAuthnController::class, 'register'])
            ->name('api.biometrics.webauthn.register');
        Route::post('clock-options', [WebAuthnController::class, 'clockOptions'])
            ->name('api.biometrics.webauthn.clock-options');
        Route::post('clock', [WebAuthnController::class, 'clock'])
            ->name('api.biometrics.webauthn.clock');
        Route::post('reset', [WebAuthnController::class, 'reset'])
            ->name('api.biometrics.webauthn.reset');
    });
});
