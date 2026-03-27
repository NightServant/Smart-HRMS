<?php

use App\Models\User;

dataset('employee-allowed-routes', [
    'dashboard',
    'leave-application',
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
    'admin.leave-management',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('evaluator-allowed-routes', [
    'performanceDashboard',
    'document-management',
    'admin.leave-management',
]);

dataset('evaluator-forbidden-routes', [
    'admin.performance-dashboard',
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
    'admin.employee-directory',
    'admin.attendance-management',
    'dashboard',
    'leave-application',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('hr-allowed-routes', [
    'admin.performance-dashboard',
    'admin.employee-directory',
    'admin.attendance-management',
    'admin.hr-leave-management',
    'training-scheduling',
    'admin.training-scheduling',
]);

dataset('hr-forbidden-routes', [
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
    'performanceDashboard',
    'dashboard',
    'document-management',
    'leave-application',
]);

dataset('administrator-allowed-routes', [
    'admin.system-dashboard',
    'admin.user-management',
    'admin.audit-logs',
    'notifications',
]);

dataset('administrator-forbidden-routes', [
    'dashboard',
    'leave-application',
    'performanceDashboard',
    'document-management',
    'admin.performance-dashboard',
    'admin.employee-directory',
    'admin.attendance-management',
    'admin.hr-leave-management',
    'admin.leave-management',
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
