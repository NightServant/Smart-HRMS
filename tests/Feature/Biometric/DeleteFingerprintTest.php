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
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_company_id' => 'company-uuid-1',
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
    $vos = array_map(fn (string $id) => [
        'id' => $id,
        'employeeCode' => 'EMP400',
        'signatureIndex' => 6,
        'signatureNumber' => 5,
        'bioType' => 1,
    ], $credentialIds);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp400', 'employeeCode' => 'EMP400']],
            ],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/login' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'login-token', 'refresh_token' => 'r', 'expires_in' => 3600],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/user/switchCompany' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'company-scoped-token', 'expires_in' => 3600],
        ], 200),
        // Credential discovery: SPA list endpoint filtered by employeeCode.
        // Returns rows with `id` and `bioType` per credential.
        'https://zlink-portal.test/zlink-api/v1.0/zlink/cms/credential/employee/list' => Http::response([
            'code' => 'OMSI0000',
            'data' => [
                'totalCount' => count($credentialIds) > 0 ? 1 : 0,
                'employees' => count($credentialIds) === 0
                    ? []
                    : [[
                        'id' => 'zlink-uuid-emp400',
                        'employeeCode' => 'EMP400',
                        'firstName' => 'Delete',
                        'lastName' => 'Test',
                        'credentials' => array_map(fn (string $id) => [
                            'id' => $id,
                            'employeeId' => 'zlink-uuid-emp400',
                            'bioType' => 1,
                            'signatureIndex' => 0,
                        ], $credentialIds),
                    ]],
            ],
        ], 200),
        // Legacy device-keyed endpoint kept faked in case other code paths
        // (status checks, etc.) hit it during the same request.
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => ['fingerprintVersionMap' => null],
        ], 200),
        // Single batch DELETE — the SPA hits this exact endpoint with
        // `{"ids": [...]}` in the body. CMSI0010 mirrors the success code
        // for credential ops.
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credentials' => Http::response([
            'code' => 'CMSI0010',
            'message' => 'Biometric template deleted ',
            'data' => null,
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

    // Confirm a single batch DELETE was sent to the v2.0 plural endpoint
    // with both credential ids in the body — that's what the SPA does.
    Http::assertSent(function ($request) {
        if ($request->method() !== 'DELETE') {
            return false;
        }

        if (! str_ends_with($request->url(), '/v2.0/zlink/cms/credentials')) {
            return false;
        }

        $body = json_decode($request->body(), true);

        return is_array($body)
            && isset($body['ids'])
            && is_array($body['ids'])
            && count($body['ids']) === 2
            && in_array('cred-uuid-1', $body['ids'], true)
            && in_array('cred-uuid-2', $body['ids'], true);
    });
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
