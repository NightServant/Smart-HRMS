<?php

use App\Http\Controllers\Api\AdmsController;
use Illuminate\Support\Facades\Route;

// ZKTeco ADMS device endpoints (unauthenticated — device sends raw HTTP)
// API key auth is enforced per-device if the device has an api_key configured.
Route::middleware('throttle:120,1')->group(function (): void {
    Route::match(['get', 'post'], '/iclock/cdata', [AdmsController::class, 'cdata']);
    Route::get('/iclock/getrequest', [AdmsController::class, 'getRequest']);
    Route::post('/iclock/devicecmd', [AdmsController::class, 'deviceCmd']);
});

// Local middleware bridge endpoint (Mode 2 — Node.js bridge posts JSON from client LAN)
Route::post('/iclock/middleware-push', [AdmsController::class, 'middlewarePush'])
    ->middleware('throttle:60,1');
