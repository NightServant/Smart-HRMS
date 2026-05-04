<?php

use App\Models\AttendanceRecord;
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

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['id' => 'zlink-id-1', 'employeeCode' => 'EMP300'],
        ], 201),
        'https://zlink-open.test/open-apis/org/v1/departments/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['currentPage' => 1, 'totalPages' => 1, 'depts' => [['id' => 'dept-1', 'name' => 'Default']]],
        ], 200),
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-300',
        'name' => 'Self Enroll User',
        'job_title' => 'Clerk',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-OTHER',
        'name' => 'Other Person',
        'job_title' => 'Clerk',
    ]);
});

test('employee can self-enroll without supplying any payload fields', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->postJson('/api/biometrics/self-enroll', []);

    $response->assertOk();
    $response->assertJsonPath('employee_id', 'EMP-300');

    expect(Employee::query()->find('EMP-300')->zkteco_pin)->not->toBeEmpty();
});

test('employee cannot tamper payload to enroll a different employee', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->postJson('/api/biometrics/self-enroll', [
        'employee_id' => 'EMP-OTHER',
    ]);

    $response->assertOk();
    $response->assertJsonPath('employee_id', 'EMP-300');

    expect(Employee::query()->find('EMP-OTHER')->zkteco_pin)->toBeNull();
});

test('enrollment-status ignores historical biometric punches when no current credential exists', function () {
    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');
    $response->assertOk();
    $response->assertJsonPath('enrolled_in_zlink', true);
    $response->assertJsonPath('finger_captured', false);

    // A historical biometric punch must NOT flip finger_captured back to true:
    // after an explicit fingerprint deletion the past punches still exist, and
    // resurrecting the enrolled state would defeat the delete.
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-300',
        'date' => '2026-04-26',
        'punch_time' => '2026-04-26 08:30:00',
        'status' => null,
        'source' => 'biometric',
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');
    $response->assertJsonPath('finger_captured', false);
});

test('biometric-enrollment page is gated to the employee role', function () {
    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)->get('/biometric-enrollment')->assertForbidden();
});

test('detected enrollment is persisted to the employee row and short-circuits subsequent Zlink calls', function () {
    config([
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp300', 'employeeCode' => 'EMP300']],
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
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => ['fingerprintVersionMap' => [
                'DEV-SN-1' => ['version' => 1, 'fingerIndex' => 2],
            ]],
        ], 200),
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    // First call detects enrollment via fingerprintVersionMap and persists.
    $this->actingAs($user)->getJson('/api/biometrics/enrollment-status')
        ->assertOk()
        ->assertJsonPath('finger_captured', true)
        ->assertJsonPath('finger_label', 'Left Middle');

    $employee = Employee::query()->find('EMP-300');
    expect($employee->fingerprint_enrolled_at)->not->toBeNull();
    expect($employee->fingerprint_finger_index)->toBe(2);

    // Second call should hit the fast path — every Zlink endpoint should
    // 500 if hit, but the request must still succeed.
    Http::fake(fn () => Http::response('should not be called', 500));

    $this->actingAs($user)->getJson('/api/biometrics/enrollment-status')
        ->assertOk()
        ->assertJsonPath('finger_captured', true)
        ->assertJsonPath('finger_label', 'Left Middle');

    Http::assertNothingSent();
});

test('enrollment-status reports finger_captured once the active registration session reports success', function () {
    config([
        'services.zlink.default_device_sn' => 'DEV-SN-1',
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_device_id' => 'portal-dev-uuid-1',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

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
                'employee' => [['id' => 'zlink-uuid-emp300', 'employeeCode' => 'EMP300']],
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
            'data' => ['results' => ['sessionId' => 'session-abc']],
        ], 200),
        // Real-world shape: code ZCDC0000 (device cloud subsystem). data.end
        // is "0" mid-capture and "1" once the session closes; data.code "0"
        // means the device reported success. data is null on the very first
        // poll before any state has been observed.
        'https://zlink-portal.test/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration/result/session-abc' => Http::sequence()
            ->push(['code' => 'ZCDC0000', 'data' => null], 200)
            ->push(['code' => 'ZCDC0000', 'data' => [
                'companyId' => 'company-uuid-1',
                'deviceId' => 'device-uuid-1',
                'code' => '0',
                'num' => '1',
                'end' => '0',
                'sessionId' => 'session-abc',
            ]], 200)
            ->push(['code' => 'ZCDC0000', 'data' => [
                'companyId' => 'company-uuid-1',
                'deviceId' => 'device-uuid-1',
                'code' => '0',
                'num' => '3',
                'end' => '1',
                'sessionId' => 'session-abc',
            ]], 200),
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => ['fingerprintVersionMap' => null],
        ], 200),
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    // Trigger enrollment so the sessionId gets cached.
    $this->actingAs($user)->postJson('/api/biometrics/remote-enroll')->assertOk();

    // First poll: data is null, session still pending.
    $this->actingAs($user)->getJson('/api/biometrics/enrollment-status')
        ->assertOk()
        ->assertJsonPath('finger_captured', false);

    // Second poll: device captured one press, session not yet closed.
    $this->actingAs($user)->getJson('/api/biometrics/enrollment-status')
        ->assertOk()
        ->assertJsonPath('finger_captured', false);

    // Third poll: end=1, session reports success.
    $this->actingAs($user)->getJson('/api/biometrics/enrollment-status')
        ->assertOk()
        ->assertJsonPath('finger_captured', true);
});

test('enrollment-status reports finger_captured when the portal lists an enrolled device', function () {
    // The open-API fingerprints/search endpoint 404s on this tenant and the
    // webhook can't reach localhost from Zlink's cloud, so the portal
    // biological-template endpoint is the only way to detect a fingerprint
    // that was just enrolled at the terminal.
    config([
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        // Open-API fingerprint search not available on this tenant.
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp300', 'employeeCode' => 'EMP300']],
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
        // Production shape: code CMSR0000, data.fingerprintVersionMap is
        // keyed by SIGNATURE VERSION (e.g. "13.0"), not by device serial.
        // Each value contains cmsCredentialRespVos[], where each credential
        // carries the actual ZKTeco finger slot under `signatureIndex`.
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => [
                'fingerprintVersionMap' => [
                    '13.0' => [
                        'cmsCredentialRespVos' => [
                            [
                                'id' => 'cred-uuid-1',
                                'employeeCode' => 'EMP300',
                                'signatureIndex' => 0,
                                'signatureNumber' => 5,
                                'bioType' => 1,
                            ],
                        ],
                        'deviceCount' => 1,
                        'deviceName' => ['Shrms'],
                    ],
                ],
            ],
        ], 200),
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');

    $response->assertOk();
    $response->assertJsonPath('finger_captured', true);
    $response->assertJsonPath('fingerprint_count', 1);
    $response->assertJsonPath('finger_index', 0);
    $response->assertJsonPath('finger_label', 'Left Pinky');

    Http::assertSent(function ($request) {
        if (! str_contains($request->url(), '/cms/credential/fingerprint/devices')) {
            return false;
        }

        $body = $request->data();

        return ($body['employeeId'] ?? null) === 'zlink-uuid-emp300'
            && ($body['bioType'] ?? null) === 1
            && ($body['signatureNumber'] ?? null) === 5;
    });
});

test('enrollment-status reports finger_captured=false when the portal returns no devices', function () {
    config([
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response('Not Found', 404),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp300', 'employeeCode' => 'EMP300']],
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
        // No fingerprints yet: portal returns the success code with a null map.
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => ['fingerprintVersionMap' => null],
        ], 200),
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');

    $response->assertOk();
    $response->assertJsonPath('finger_captured', false);
    $response->assertJsonPath('fingerprint_count', 0);
});

test('stale enrollment is cleared when Zlink reports no fingerprint (reconciliation)', function () {
    // Simulates EMP-002 / EMP-006 scenario: fingerprint_enrolled_at is set in
    // the DB (from a previous enrollment), but the fingerprint was deleted in
    // the Zlink portal. The confirmation cache is expired (not seeded here),
    // so the next status call goes through to Zlink, detects no credential,
    // and clears the DB column.
    config([
        'services.zlink.portal_url' => 'https://zlink-portal.test',
        'services.zlink.portal_username' => 'admin@example.test',
        'services.zlink.portal_password' => 'secret',
        'services.zlink.portal_company_id' => 'company-uuid-1',
    ]);

    Employee::query()->where('employee_id', 'EMP-300')->update([
        'zkteco_pin' => 'EMP300',
        // Fingerprint was deleted in Zlink but DB still shows enrolled.
        'fingerprint_enrolled_at' => now()->subDay(),
        'fingerprint_finger_index' => 2,
    ]);

    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        // Open-API returns no fingerprints (endpoint available but empty).
        'https://zlink-open.test/open-apis/biometric/v1/fingerprints/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['fingerprints' => []],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'employee' => [['id' => 'zlink-uuid-emp300', 'employeeCode' => 'EMP300']],
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
        // Portal also reports no fingerprint devices.
        'https://zlink-portal.test/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices' => Http::response([
            'code' => 'CMSR0000',
            'data' => ['fingerprintVersionMap' => null],
        ], 200),
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');

    $response->assertOk();
    $response->assertJsonPath('finger_captured', false);

    // The DB column must be cleared so the badge correctly shows "Not enrolled".
    $employee = Employee::query()->find('EMP-300');
    expect($employee->fingerprint_enrolled_at)->toBeNull();
    expect($employee->fingerprint_finger_index)->toBeNull();
});
