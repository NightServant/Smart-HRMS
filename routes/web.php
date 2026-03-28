<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\SystemDashboardController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Api\AdmsController;
use App\Http\Controllers\AttendanceImportController;
use App\Http\Controllers\AttendanceRecordController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Export_CSV_Controller;
use App\Http\Controllers\FlatFatController;
use App\Http\Controllers\Import_CSV_Controller;
use App\Http\Controllers\IwrController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaginationController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\SeminarsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'role:employee'])
    ->name('dashboard');

Route::get('leave-application', [LeaveRequestController::class, 'create'])
    ->middleware(['auth', 'role:employee'])
    ->name('leave-application');
Route::post('leave-application', [LeaveRequestController::class, 'store'])
    ->middleware(['auth', 'role:employee'])
    ->name('leave-application.store');

Route::get('submit-evaluation', function () {
    return Inertia::render('submit-evaluation');
})->middleware(['auth', 'role:employee'])->name('submit-evaluation');

Route::get('attendance', [AttendanceRecordController::class, 'index'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance');
Route::post('attendance/punch', [AttendanceRecordController::class, 'punch'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance.punch');
Route::post('attendance/biometric-punch', [AdmsController::class, 'simulate'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance.biometric-punch');

Route::get('notifications', [NotificationController::class, 'index'])
    ->middleware(['auth', 'role:administrator,employee,evaluator,hr-personnel'])
    ->name('notifications');
Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
    ->middleware(['auth'])
    ->name('notifications.read');
Route::delete('notifications/{notification}', [NotificationController::class, 'dismiss'])
    ->middleware(['auth'])
    ->name('notifications.dismiss');
Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])
    ->middleware(['auth'])
    ->name('notifications.mark-all-read');

Route::get('performanceDashboard', [SeminarsController::class, 'performanceDashboard'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('performanceDashboard');

Route::get('admin/performance-dashboard', [SeminarsController::class, 'adminPerformanceDashboard'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.performance-dashboard');

Route::get('admin/employee-directory', [PaginationController::class, 'employeeDirectory'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.employee-directory');

Route::get('document-management', [PaginationController::class, 'documentManagement'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('document-management');

Route::get('admin/historical-data', [PaginationController::class, 'adminHistoricalManagement'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.historical-data');
Route::post('admin/historical-data/import-csv', [Import_CSV_Controller::class, 'storeHistorical'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.historical-data.import-csv');
Route::delete('admin/historical-data/clear-imported', [Import_CSV_Controller::class, 'clearHistoricalImported'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.historical-data.clear-imported');

Route::get('admin/attendance-management', [PaginationController::class, 'attendanceManagement'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.attendance-management');
Route::post('admin/attendance-management/import-csv', [AttendanceImportController::class, 'store'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.attendance-management.import-csv');
Route::get('admin/attendance-management/export-csv', [Export_CSV_Controller::class, 'index'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.attendance-management.export-csv');
Route::delete('admin/attendance-management/clear', [AttendanceImportController::class, 'destroy'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.attendance-management.clear');

// FlatFAT Real-Time Dashboard APIs
Route::get('api/flatfat/organization-aggregate', [FlatFatController::class, 'organizationAggregate'])
    ->middleware(['auth', 'role:administrator,employee,evaluator,hr-personnel'])
    ->name('api.flatfat.organization-aggregate');
Route::get('api/flatfat/employee/{employeeId}', [FlatFatController::class, 'employeeScore'])
    ->middleware(['auth', 'role:administrator,employee,evaluator,hr-personnel'])
    ->name('api.flatfat.employee-score');
Route::get('api/flatfat/attendance-metrics', [FlatFatController::class, 'attendanceMetrics'])
    ->middleware(['auth', 'role:administrator,employee,evaluator,hr-personnel'])
    ->name('api.flatfat.attendance-metrics');
Route::get('api/flatfat/quarter-scores', [FlatFatController::class, 'quarterScores'])
    ->middleware(['auth', 'role:administrator,employee,evaluator,hr-personnel'])
    ->name('api.flatfat.quarter-scores');
Route::get('api/flatfat/employee-quarter-scores', [FlatFatController::class, 'employeeQuarterScores'])
    ->middleware(['auth', 'role:employee'])
    ->name('api.flatfat.employee-quarter-scores');

Route::get('admin/leave-management', [PaginationController::class, 'leaveManagement'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('admin.leave-management');

Route::get('admin/hr-leave-management', [PaginationController::class, 'hrLeaveManagement'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.hr-leave-management');

// IWR IPCR routes
Route::post('ipcr/submit', [IwrController::class, 'submitIpcr'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.submit');
Route::post('ipcr/evaluate', [IwrController::class, 'saveEvaluation'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('ipcr.evaluate');

// IWR Leave approval routes
Route::post('leave/{leaveRequest}/approve', [IwrController::class, 'approveLeave'])
    ->middleware(['auth', 'role:evaluator,hr-personnel'])
    ->name('leave.approve');
Route::post('leave/{leaveRequest}/reject', [IwrController::class, 'rejectLeave'])
    ->middleware(['auth', 'role:evaluator,hr-personnel'])
    ->name('leave.reject');
Route::get('leave/{leaveRequest}/document/{type}', [LeaveRequestController::class, 'downloadDocument'])
    ->middleware(['auth', 'role:evaluator,hr-personnel'])
    ->name('leave.document');

Route::get('evaluation-page', [IwrController::class, 'evaluationPage'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('evaluation-page');

Route::get('training-scheduling', [SeminarsController::class, 'index'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('training-scheduling');

Route::get('admin/training-scheduling', [SeminarsController::class, 'adminTrainingScheduling'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.training-scheduling');

Route::prefix('admin')->middleware(['auth', 'role:administrator'])->name('admin.')->group(function (): void {
    Route::get('system-dashboard', [SystemDashboardController::class, 'index'])->name('system-dashboard');
    Route::get('user-management', [UserManagementController::class, 'index'])->name('user-management');
    Route::post('user-management', [UserManagementController::class, 'store'])->name('user-management.store');
    Route::put('user-management/{user}', [UserManagementController::class, 'update'])->name('user-management.update');
    Route::post('user-management/{user}/activate', [UserManagementController::class, 'activate'])->name('user-management.activate');
    Route::post('user-management/{user}/deactivate', [UserManagementController::class, 'deactivate'])->name('user-management.deactivate');
    Route::post('user-management/{user}/password-reset', [UserManagementController::class, 'sendPasswordReset'])->name('user-management.password-reset');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs');
});

Route::resource('seminars', SeminarsController::class)
    ->only(['store', 'update', 'destroy'])
    ->middleware(['auth', 'role:hr-personnel']);

// PPE (Predictive Performance Evaluation) API
Route::get('api/predict', [PredictionController::class, 'predict'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('api.predict');

require __DIR__.'/settings.php';
