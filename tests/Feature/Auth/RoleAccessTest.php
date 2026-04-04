<?php

use App\Models\User;

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
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
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
    'admin.leave-management',
    'notifications',
]);

dataset('evaluator-forbidden-routes', [
    'admin.performance-dashboard',
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
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
    'notifications',
]);

dataset('hr-forbidden-routes', [
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
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
    'admin.system-dashboard',
]);

dataset('administrator-allowed-routes', [
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
]);

dataset('administrator-forbidden-routes', [
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
    'admin.pmt-review',
    'notifications',
    'training-scheduling',
    'admin.training-scheduling',
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

test('administrators can access administrator routes', function (string $routeName) {
    $user = User::factory()->asAdministrator()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk();
})->with('administrator-allowed-routes');

test('administrators cannot access employee, evaluator, and hr personnel routes', function (string $routeName) {
    $user = User::factory()->asAdministrator()->create();

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertForbidden();
})->with('administrator-forbidden-routes');
