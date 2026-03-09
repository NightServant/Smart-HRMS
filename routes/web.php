<?php

use App\Http\Controllers\Export_CSV_Controller;
use App\Http\Controllers\Import_CSV_Controller;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\PaginationController;
use App\Http\Controllers\SeminarsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified', 'role:employee'])->name('dashboard');

Route::get('attendance', function () {
    return Inertia::render('attendance');
})->middleware(['auth', 'verified', 'role:employee'])->name('attendance');

Route::get('leave-application', [LeaveRequestController::class, 'create'])
    ->middleware(['auth', 'verified', 'role:employee'])
    ->name('leave-application');
Route::post('leave-application', [LeaveRequestController::class, 'store'])
    ->middleware(['auth', 'verified', 'role:employee'])
    ->name('leave-application.store');

Route::get('notifications', function () {
    return Inertia::render('notifications');
})->middleware(['auth', 'verified', 'role:employee,evaluator'])->name('notifications');

Route::get('performanceDashboard', [SeminarsController::class, 'performanceDashboard'])
    ->middleware(['auth', 'verified', 'role:evaluator'])
    ->name('performanceDashboard');

Route::get('admin/performance-dashboard', [SeminarsController::class, 'adminPerformanceDashboard'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.performance-dashboard');

Route::get('admin/employee-directory', [PaginationController::class, 'employeeDirectory'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.employee-directory');

Route::get('document-management', [PaginationController::class, 'documentManagement'])
    ->middleware(['auth', 'verified', 'role:evaluator'])
    ->name('document-management');

Route::get('admin/historical-data', [PaginationController::class, 'adminHistoricalManagement'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.historical-data');
Route::post('admin/historical-data/import-csv', [Import_CSV_Controller::class, 'storeHistorical'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.historical-data.import-csv');
Route::delete('admin/historical-data/clear-imported', [Import_CSV_Controller::class, 'clearHistoricalImported'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.historical-data.clear-imported');

Route::get('admin/attendance-management', [PaginationController::class, 'attendanceManagement'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.attendance-management');
Route::get('admin/attendance-management/export-csv', [Export_CSV_Controller::class, 'index'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.attendance-management.export-csv');

Route::get('admin/leave-management', [PaginationController::class, 'leaveManagement'])
    ->middleware(['auth', 'verified', 'role:hr-personnel,evaluator'])
    ->name('admin.leave-management');

Route::get('evaluation-page', function () {
    return Inertia::render('evaluation-page');
})->middleware(['auth', 'verified'])->name('evaluation-page');

Route::get('training-scheduling', [SeminarsController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('training-scheduling');

Route::get('admin/training-scheduling', [SeminarsController::class, 'adminTrainingScheduling'])
    ->middleware(['auth', 'verified', 'role:hr-personnel'])
    ->name('admin.training-scheduling');

Route::resource('seminars', SeminarsController::class)
    ->only(['store', 'update', 'destroy'])
    ->middleware(['auth', 'verified', 'role:hr-personnel']);

require __DIR__.'/settings.php';
