<?php

use App\Http\Controllers\Api\AdmsController;
use Illuminate\Support\Facades\Route;

// ZKTeco ADMS device endpoints (unauthenticated — device sends raw HTTP)
Route::match(['get', 'post'], '/iclock/cdata', [AdmsController::class, 'cdata']);
Route::get('/iclock/getrequest', [AdmsController::class, 'getRequest']);
Route::post('/iclock/devicecmd', [AdmsController::class, 'deviceCmd']);
