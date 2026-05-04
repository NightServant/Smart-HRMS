<?php

use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\EmployeeDirectoryController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\AttendanceImportController;
use App\Http\Controllers\AttendanceRecordController;
use App\Http\Controllers\BiometricEnrollmentController;
use App\Http\Controllers\BiometricSimulatorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Export_CSV_Controller;
use App\Http\Controllers\FirstLoginPasswordPromptController;
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

Route::get('/maintenance', function () {
    $maintenanceMode = \App\Models\SystemSetting::get('maintenance_mode', false);

    if (! $maintenanceMode) {
        return redirect('/dashboard');
    }

    $message = \App\Models\SystemSetting::get('maintenance_message')
        ?? 'The system is currently undergoing maintenance. Please try again later.';

    return Inertia::render('maintenance', [
        'message' => $message,
    ]);
})->middleware('auth')->name('maintenance');

Route::get('dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'role:employee'])
    ->name('dashboard');
Route::get('first-login-password-prompt', [FirstLoginPasswordPromptController::class, 'show'])
    ->middleware(['auth', 'role:employee'])
    ->name('first-login-password-prompt');

Route::get('leave-application', [LeaveRequestController::class, 'create'])
    ->middleware(['auth', 'role:employee'])
    ->name('leave-application');
Route::post('leave-application', [LeaveRequestController::class, 'store'])
    ->middleware(['auth', 'role:employee'])
    ->name('leave-application.store');

Route::get('submit-evaluation', [IwrController::class, 'submitEvaluationPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('submit-evaluation');
Route::get('ipcr/form', [IwrController::class, 'ipcrFormPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.form');
Route::get('ipcr/print', [IwrController::class, 'printableIpcrPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.print');
Route::get('ipcr/target', [IwrController::class, 'ipcrTargetPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.target');
Route::get('ipcr/target/form', [IwrController::class, 'ipcrTargetFormPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.target.form');
Route::post('ipcr/target', [IwrController::class, 'saveIpcrTarget'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.target.save');
Route::get('ipcr/target/{target}/print', [IwrController::class, 'printableIpcrTargetPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.target.print');

Route::get('attendance', [AttendanceRecordController::class, 'index'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance');
Route::post('attendance/punch', [AttendanceRecordController::class, 'punch'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance.punch');
Route::post('attendance/biometric-punch', [BiometricSimulatorController::class, 'store'])
    ->middleware(['auth', 'role:employee'])
    ->name('attendance.biometric-punch');

Route::get('biometric-enrollment', [BiometricEnrollmentController::class, 'show'])
    ->middleware(['auth', 'role:employee'])
    ->name('biometric.enrollment');

Route::get('notifications', [NotificationController::class, 'index'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel,pmt'])
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
    ->middleware(['auth', 'role:evaluator,hr-personnel'])
    ->name('admin.employee-directory');
Route::patch('admin/employee-directory/{employee}/employment-status', [PaginationController::class, 'updateEmployeeEmploymentStatus'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.employee-directory.employment-status');
Route::post('admin/employee-directory', [EmployeeDirectoryController::class, 'store'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.employee-directory.store');
Route::put('admin/employee-directory/{employee}', [EmployeeDirectoryController::class, 'update'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.employee-directory.update');
Route::delete('admin/employee-directory/{employee}', [EmployeeDirectoryController::class, 'destroy'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.employee-directory.destroy');

Route::post('admin/departments', [DepartmentController::class, 'store'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.departments.store');
Route::put('admin/departments/{department}', [DepartmentController::class, 'update'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.departments.update');

Route::post('admin/positions', [PositionController::class, 'store'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.positions.store');

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

Route::get('admin/evaluator-attendance', [PaginationController::class, 'evaluatorAttendanceManagement'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('admin.evaluator-attendance');
Route::patch('admin/evaluator-attendance/toggle-manual-punch/{employee}', [AttendanceRecordController::class, 'updateManualPunchStatus'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('admin.evaluator-attendance.toggle-manual-punch');
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
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.organization-aggregate');
Route::get('api/flatfat/employee/{employeeId}', [FlatFatController::class, 'employeeScore'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.employee-score');
Route::get('api/flatfat/attendance-metrics', [FlatFatController::class, 'attendanceMetrics'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.attendance-metrics');
Route::get('api/flatfat/quarter-scores', [FlatFatController::class, 'quarterScores'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.quarter-scores');
Route::get('api/flatfat/semester-scores', [FlatFatController::class, 'semesterScores'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.semester-scores');
Route::get('api/flatfat/evaluation-risk-summary', [FlatFatController::class, 'evaluationRiskSummary'])
    ->middleware(['auth', 'role:employee,evaluator,hr-personnel'])
    ->name('api.flatfat.evaluation-risk-summary');
Route::get('api/flatfat/employee-quarter-scores', [FlatFatController::class, 'employeeQuarterScores'])
    ->middleware(['auth', 'role:employee'])
    ->name('api.flatfat.employee-quarter-scores');
Route::get('api/flatfat/employee-semester-scores', [FlatFatController::class, 'employeeSemesterScores'])
    ->middleware(['auth', 'role:employee'])
    ->name('api.flatfat.employee-semester-scores');

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
    ->middleware(['auth'])
    ->name('leave.document');
Route::get('leave-application/{leaveRequest}/print', [LeaveRequestController::class, 'printablePage'])
    ->middleware(['auth', 'role:employee'])
    ->name('leave-application.print');

Route::get('evaluation-page', [IwrController::class, 'evaluationPage'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('evaluation-page');
Route::get('evaluator/ipcr-target', [IwrController::class, 'evaluatorIpcrTargetPage'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('evaluator.ipcr-target');
Route::post('ipcr/target/{target}/review', [IwrController::class, 'evaluatorReviewTarget'])
    ->middleware(['auth', 'role:evaluator'])
    ->name('ipcr.target.evaluator-review');
Route::get('ipcr/target-review', [IwrController::class, 'reviewerTargetPage'])
    ->middleware(['auth', 'role:evaluator,hr-personnel,pmt'])
    ->name('ipcr.target.review');

// IWR IPCR v5.1 routes
Route::get('admin/ipcr/hr-review', [IwrController::class, 'hrReviewPage'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.hr-review');
Route::get('admin/ipcr/target-management', [IwrController::class, 'hrIpcrTargetPage'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.target-management');
Route::post('admin/ipcr/target-finalize/{target}', [IwrController::class, 'hrFinalizeTarget'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.target-finalize');
Route::post('ipcr/hr-review/{submission}', [IwrController::class, 'saveHrReview'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('ipcr.hr-review');
Route::post('admin/ipcr/period', [IwrController::class, 'updateIpcrPeriod'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.period.update');
Route::post('admin/ipcr/target-notify', [IwrController::class, 'notifyIpcrTargetWindow'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.target.notify');
Route::post('admin/ipcr/target-close', [IwrController::class, 'closeIpcrTargetWindow'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.target.close');
Route::post('admin/ipcr/period-extensions', [IwrController::class, 'grantPeriodExtension'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.extensions.grant');
Route::delete('admin/ipcr/period-extensions/{extension}', [IwrController::class, 'revokePeriodExtension'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.extensions.revoke');
Route::post('admin/ipcr/historical-target', [IwrController::class, 'storeHistoricalTarget'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.historical.target');
Route::post('admin/ipcr/historical-evaluation', [IwrController::class, 'storeHistoricalEvaluation'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.ipcr.historical.evaluation');
Route::get('ipcr/appeal/{submission}', [IwrController::class, 'appealPage'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.appeal');
Route::post('ipcr/appeal/{submission}', [IwrController::class, 'submitAppeal'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.appeal.submit');
Route::post('ipcr/no-appeal/{submission}', [IwrController::class, 'submitNoAppeal'])
    ->middleware(['auth', 'role:employee'])
    ->name('ipcr.no-appeal');
Route::get('ipcr/appeal/{appeal}/evidence/{index}', [IwrController::class, 'downloadAppealEvidence'])
    ->whereNumber('index')
    ->middleware(['auth'])
    ->name('ipcr.appeal.evidence');
Route::get('admin/ipcr/pmt-review', [IwrController::class, 'pmtReviewPage'])
    ->middleware(['auth', 'role:pmt'])
    ->name('admin.pmt-review');
Route::post('ipcr/pmt-review/{submission}', [IwrController::class, 'savePmtReview'])
    ->middleware(['auth', 'role:pmt'])
    ->name('ipcr.pmt-review');
Route::get('admin/ipcr/hr-finalize', [IwrController::class, 'hrFinalizePage'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.hr-finalize');
Route::post('ipcr/finalize/{submission}', [IwrController::class, 'finalizeIpcr'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('ipcr.finalize');

Route::get('training-scheduling', [SeminarsController::class, 'index'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('training-scheduling');

Route::get('admin/training-scheduling', [SeminarsController::class, 'adminTrainingScheduling'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.training-scheduling');

Route::get('admin/user-management', [UserManagementController::class, 'index'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management');
Route::post('admin/user-management', [UserManagementController::class, 'store'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management.store');
Route::put('admin/user-management/{user}', [UserManagementController::class, 'update'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management.update');
Route::post('admin/user-management/{user}/activate', [UserManagementController::class, 'activate'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management.activate');
Route::post('admin/user-management/{user}/deactivate', [UserManagementController::class, 'deactivate'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management.deactivate');
Route::post('admin/user-management/{user}/password-reset', [UserManagementController::class, 'sendPasswordReset'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.user-management.password-reset');

Route::post('admin/system-settings', [SystemSettingController::class, 'update'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.system-settings.update');

Route::resource('seminars', SeminarsController::class)
    ->only(['store', 'update', 'destroy'])
    ->middleware(['auth', 'role:hr-personnel']);

Route::post('admin/training-suggestions/notify', [SeminarsController::class, 'triggerTrainingNotification'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.training-suggestions.notify');

Route::post('admin/training-suggestions/notify-all', [SeminarsController::class, 'notifyAllEmployeesTraining'])
    ->middleware(['auth', 'role:hr-personnel'])
    ->name('admin.training-suggestions.notify-all');

// PPE (Predictive Performance Evaluation) API
Route::get('api/predict', [PredictionController::class, 'predict'])
    ->middleware(['auth', 'role:evaluator,hr-personnel'])
    ->name('api.predict');

require __DIR__.'/settings.php';
