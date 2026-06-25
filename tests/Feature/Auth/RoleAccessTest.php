<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

dataset('employee-allowed-routes', [
    'dashboard',
    'leave-application',
    'submit-evaluation',
    'ipcr.form',
    'notifications',
]);

dataset('employee-forbidden-routes', [
    'performanceDashboard',
    'document-management',
    'admin.performance-dashboard',
    'admin.user-management',
    'admin.employee-directory',
    'admin.attendance-management',
    'admin.evaluator-attendance',
    'admin.leave-management',
    'admin.hr-leave-management',
    'admin.hr-review',
    'admin.hr-finalize',
    'admin.pmt-review',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('evaluator-allowed-routes', [
    'performanceDashboard',
    'admin.employee-directory',
    'admin.evaluator-attendance',
    'document-management',
    'ipcr.target.review',
    'admin.leave-management',
    'notifications',
]);

dataset('evaluator-forbidden-routes', [
    'admin.performance-dashboard',
    'admin.user-management',
    'dashboard',
    'leave-application',
    'submit-evaluation',
    'ipcr.form',
    'admin.attendance-management',
    'admin.hr-leave-management',
    'admin.hr-review',
    'admin.hr-finalize',
    'admin.pmt-review',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('hr-allowed-routes', [
    'admin.performance-dashboard',
    'admin.employee-directory',
    'admin.attendance-management',
    'admin.hr-leave-management',
    'admin.hr-review',
    'admin.hr-finalize',
    'training-scheduling',
    'admin.training-scheduling',
    'ipcr.target.review',
    'notifications',
]);

dataset('hr-forbidden-routes', [
    'performanceDashboard',
    'dashboard',
    'document-management',
    'leave-application',
    'submit-evaluation',
    'ipcr.form',
    'admin.evaluator-attendance',
    'admin.leave-management',
    'admin.pmt-review',
]);

dataset('pmt-allowed-routes', [
    'admin.pmt-review',
    'ipcr.target.review',
    'notifications',
]);

dataset('pmt-forbidden-routes', [
    'dashboard',
    'leave-application',
    'submit-evaluation',
    'ipcr.form',
    'performanceDashboard',
    'document-management',
    'admin.performance-dashboard',
    'admin.employee-directory',
    'admin.attendance-management',
    'admin.evaluator-attendance',
    'admin.hr-leave-management',
    'admin.leave-management',
    'admin.hr-review',
    'admin.hr-finalize',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('retired-admin-routes', [
    'admin.system-dashboard',
    'admin.audit-logs',
    'admin.system-settings',
    'admin.reports',
    'admin.activity-logs',
]);

test('employee can access employee routes', function (string $routeName) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk();
})->with('employee-allowed-routes');

test('employee cannot access evaluator and hr personnel routes', function (string $routeName) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertForbidden();
})->with('employee-forbidden-routes');

test('evaluator can access evaluator routes', function (string $routeName) {
    $user = User::factory()->asEvaluator()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk();
})->with('evaluator-allowed-routes');

test('evaluator cannot access hr personnel routes', function (string $routeName) {
    $user = User::factory()->asEvaluator()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertForbidden();
})->with('evaluator-forbidden-routes');

test('hr personnel can access hr personnel routes', function (string $routeName) {
    $user = User::factory()->asHrPersonnel()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk();
})->with('hr-allowed-routes');

test('hr personnel cannot access employee and evaluator routes', function (string $routeName) {
    $user = User::factory()->asHrPersonnel()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertForbidden();
})->with('hr-forbidden-routes');

test('pmt can access pmt routes', function (string $routeName) {
    $user = User::factory()->asPmt()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk();
})->with('pmt-allowed-routes');

test('pmt cannot access non-pmt routes', function (string $routeName) {
    $user = User::factory()->asPmt()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertForbidden();
})->with('pmt-forbidden-routes');

test('retired admin routes are not registered', function (string $routeName) {
    expect(Route::has($routeName))->toBeFalse();
})->with('retired-admin-routes');

test('hr personnel are redirected from user management to employee directory', function () {
    $user = User::factory()->asHrPersonnel()->create();

    $this->actingAs($user)
        ->get(route('admin.user-management'))
        ->assertRedirect(route('admin.employee-directory'));
});
