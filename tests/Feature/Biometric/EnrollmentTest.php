<?php

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zlink.url' => 'https://zlink-open.test',
        'services.zlink.app_key' => 'test-app-key',
        'services.zlink.app_secret' => 'test-app-secret',
        'services.zlink.default_department_id' => 'dept-1',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-200',
        'name' => 'Hr Subject',
        'job_title' => 'Analyst',
    ]);
});

function fakeZlinkAuth(): void
{
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['id' => 'zlink-id-1', 'employeeCode' => 'EMP200'],
        ], 201),
        'https://zlink-open.test/open-apis/org/v1/departments/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'depts' => [['id' => 'dept-1', 'name' => 'Default Dept']],
            ],
        ], 200),
    ]);
}

test('hr personnel can enroll an employee and zkteco_pin is persisted', function () {
    fakeZlinkAuth();

    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
    ]);

    $response->assertOk();
    $response->assertJsonPath('status', 'pushed');
    $response->assertJsonPath('department_id', 'dept-1');

    $employee = Employee::query()->find('EMP-200');
    expect($employee->zkteco_pin)->not->toBeEmpty();
});

test('re-enrolling an already enrolled employee is idempotent', function () {
    fakeZlinkAuth();

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
    ]);

    $response->assertOk();
    $response->assertJsonPath('status', 'already_enrolled');

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/open-apis/org/v1/employees') && $request->method() === 'POST');
});

test('employee role cannot call the hr enroll endpoint', function () {
    fakeZlinkAuth();

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
    ]);

    $response->assertForbidden();
});

test('remote enrollment is refused when the employee already has fingerprints on zlink', function () {
    config(['services.zlink.default_device_sn' => 'DEV-SN-1']);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['fingerprints' => [['fingerIndex' => 1], ['fingerIndex' => 2]]],
        ], 200),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertStatus(500);
    expect($response->json('message') ?? $response->json('error') ?? '')
        ->toContain('already enrolled');

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/open-apis/biometric/v1/remote-enroll'));
});

test('remote enrollment is refused when the fingerprint lookup itself fails', function () {
    config(['services.zlink.default_device_sn' => 'DEV-SN-1']);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('upstream error', 500),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertStatus(500);
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/open-apis/biometric/v1/remote-enroll'));
});

test('remote enrollment proceeds when no fingerprints exist on zlink', function () {
    config(['services.zlink.default_device_sn' => 'DEV-SN-1']);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['fingerprints' => []],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/remote-enroll' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [],
        ], 200),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertOk();
    $response->assertJsonPath('device_sn', 'DEV-SN-1');
    $response->assertJsonPath('device_user_id', 'EMP200');
    $response->assertJsonPath('remote_triggered', true);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/open-apis/biometric/v1/remote-enroll'));
});

test('remote enrollment falls back to portal when open API returns 404', function () {
    config([
        'services.zlink.default_device_sn' => 'DEV-SN-1',
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_device_id' => 'portal-dev-uuid-1',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/biometric/v1/remote-enroll' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp200', 'employeeCode' => 'EMP200']],
            ],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/login' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'login-token', 'refresh_token' => 'portal-refresh', 'expires_in' => 3600],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/user/switchCompany' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'company-scoped-token', 'expires_in' => 3600],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['registrationId' => 'reg-1'],
        ], 200),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertOk();
    $response->assertJsonPath('remote_triggered', true);

    Http::assertSent(function ($request) {
        if (! str_contains($request->url(), '/customer/dcc/device/remoteRegistration')) {
            return false;
        }
        $body = $request->data();

        // Browser-mimicking headers + Authorization cookie are required to
        // dodge ZKBC0004 "No permission". Asserting them here so a future
        // refactor doesn't silently drop the header set.
        $cookieHeader = implode('; ', $request->header('Cookie') ?? []);

        return ($body['deviceId'] ?? null) === 'portal-dev-uuid-1'
            && ($body['employeeId'] ?? null) === 'zlink-uuid-emp200'
            && ($body['pin'] ?? null) === 'EMP200'
            && ($body['enrollType'] ?? null) === 1
            && $request->header('Authorization')[0] === 'Bearer company-scoped-token'
            && ($request->header('Source')[0] ?? null) === 'pc'
            && ($request->header('X-CSRF-Token')[0] ?? null) === 'TOKEN'
            && ($request->header('Origin')[0] ?? null) === 'https://zlink-portal.test'
            && str_contains($cookieHeader, 'Authorization=company-scoped-token')
            && str_contains($cookieHeader, 'RefreshToken=portal-refresh');
    });

    Http::assertSent(function ($request) {
        if (! str_contains($request->url(), '/customer/sso/user/switchCompany')) {
            return false;
        }

        return $request->method() === 'PUT'
            && ($request->data()['companyId'] ?? null) === 'company-uuid-1'
            && ($request->data()['fromType'] ?? null) === 'PC'
            && $request->header('Authorization')[0] === 'Bearer login-token';
    });
});

test('portal remoteRegistration accepts the DMSI0000 success code with sessionId', function () {
    // Real-world response shape: the dcc/device/remoteRegistration endpoint
    // returns code DMSI0000 (not ZCOP0000) with a sessionId nested under
    // data.results. Regression guard for the day someone "tightens" the code
    // check and accidentally rejects real successes.
    config([
        'services.zlink.default_device_sn' => 'DEV-SN-1',
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_device_id' => 'portal-dev-uuid-1',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/biometric/v1/remote-enroll' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp200', 'employeeCode' => 'EMP200']],
            ],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/login' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'login-token', 'refresh_token' => 'portal-refresh', 'expires_in' => 3600],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/sso/user/switchCompany' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['access_token' => 'company-scoped-token', 'expires_in' => 3600],
        ], 200),
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration' => Http::response([
            'code' => 'DMSI0000',
            'message' => 'Success ',
            'data' => ['results' => ['sessionId' => '455f9115ba574bb9899962eeffd70730']],
        ], 200),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertOk();
    $response->assertJsonPath('remote_triggered', true);
});

test('remote enrollment returns remote_triggered=false when neither open API nor portal works', function () {
    config([
        'services.zlink.default_device_sn' => 'DEV-SN-1',
        'services.zlink.portal_username' => null,
        'services.zlink.portal_password' => null,
    ]);

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP200']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/biometric/v1/remote-enroll' => Http::response('Not Found', 404),
    ]);

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/remote-enroll');

    $response->assertOk();
    $response->assertJsonPath('remote_triggered', false);
    $response->assertJsonStructure(['device_sn', 'device_user_id', 'remote_triggered', 'instructions']);
});
