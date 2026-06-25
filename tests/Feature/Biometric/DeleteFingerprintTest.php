<?php

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zlink.url' => 'https://zlink-open.test',
        'services.zlink.app_key' => 'test-app-key',
        'services.zlink.app_secret' => 'test-app-secret',
        'services.zlink.proxy_url' => 'https://proxy.test',
        'services.zlink.proxy_api_key' => 'proxy-key',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-400',
        'name' => 'Delete Test User',
        'job_title' => 'Clerk',
        'zkteco_pin' => 'EMP400',
        'fingerprint_enrolled_at' => Carbon::now()->subDays(2),
        'fingerprint_finger_index' => 6,
    ]);
});

function fakeZlinkPortalForDelete(array $credentialIds = ['cred-uuid-1']): void
{
    // The proxy owns credential discovery + deletion now; Smart HRMS just
    // calls DELETE /v1/employees/{code}/fingerprints and gets back a count.
    Http::fake([
        'https://proxy.test/v1/employees/*' => Http::response([
            'deleted' => count($credentialIds),
        ], 200),
    ]);
}

test('employee can delete their own fingerprint and Zlink credentials are removed', function () {
    fakeZlinkPortalForDelete(['cred-uuid-1', 'cred-uuid-2']);

    $user = User::factory()->create([
        'employee_id' => 'EMP-400',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->deleteJson('/api/biometrics/fingerprint');

    $response->assertOk();
    $response->assertJsonPath('deleted', 2);
    $response->assertJsonPath('cleared_locally', true);

    $employee = Employee::query()->find('EMP-400');
    expect($employee->fingerprint_enrolled_at)->toBeNull();
    expect($employee->fingerprint_finger_index)->toBeNull();

    // Confirm the delete was delegated to the proxy with the bearer key —
    // the app no longer talks to Zlink's credential endpoints directly.
    Http::assertSent(fn ($request) => $request->method() === 'DELETE'
        && str_ends_with($request->url(), '/v1/employees/EMP400/fingerprints')
        && $request->header('Authorization')[0] === 'Bearer proxy-key');
});

test('delete is idempotent when no credentials exist on Zlink', function () {
    fakeZlinkPortalForDelete([]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-400',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->deleteJson('/api/biometrics/fingerprint');

    $response->assertOk();
    $response->assertJsonPath('deleted', 0);
    $response->assertJsonPath('cleared_locally', true);

    expect(Employee::query()->find('EMP-400')->fingerprint_enrolled_at)->toBeNull();

    // Must NOT have hit the delete endpoint when there's nothing to delete.
    Http::assertNotSent(function ($request) {
        return $request->method() === 'DELETE'
            && str_contains($request->url(), '/cms/credentials');
    });
});

test('an employee cannot delete another employees fingerprint', function () {
    fakeZlinkPortalForDelete();

    Employee::query()->create([
        'employee_id' => 'EMP-OTHER',
        'name' => 'Other',
        'job_title' => 'Clerk',
        'zkteco_pin' => 'EMPOTHER',
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-OTHER',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    // Employee role: controller forces employee_id to the user's own; the
    // request payload is ignored. So passing EMP-400 still operates on
    // EMP-OTHER, which has no fingerprint — delete is a no-op there, and
    // EMP-400 stays enrolled.
    $response = $this->actingAs($user)->deleteJson('/api/biometrics/fingerprint', [
        'employee_id' => 'EMP-400',
    ]);

    $response->assertOk();

    expect(Employee::query()->find('EMP-400')->fingerprint_enrolled_at)
        ->not->toBeNull();
});

test('hr-personnel can delete any employees fingerprint by employee_id', function () {
    fakeZlinkPortalForDelete(['cred-uuid-1']);

    $hr = User::factory()->create([
        'role' => User::ROLE_HR_PERSONNEL,
    ]);

    $response = $this->actingAs($hr)->deleteJson('/api/biometrics/fingerprint', [
        'employee_id' => 'EMP-400',
    ]);

    $response->assertOk();
    $response->assertJsonPath('deleted', 1);

    expect(Employee::query()->find('EMP-400')->fingerprint_enrolled_at)->toBeNull();
});

test('the route requires authentication', function () {
    $response = $this->deleteJson('/api/biometrics/fingerprint');

    $response->assertUnauthorized();
});
