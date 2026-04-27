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

test('enrollment-status reports finger_captured once a biometric punch exists', function () {
    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP300']);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');
    $response->assertOk();
    $response->assertJsonPath('enrolled_in_zlink', true);
    $response->assertJsonPath('finger_captured', false);

    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-300',
        'date' => '2026-04-26',
        'punch_time' => '2026-04-26 08:30:00',
        'status' => null,
        'source' => 'biometric',
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');
    $response->assertJsonPath('finger_captured', true);
});

test('biometric-enrollment page is gated to the employee role', function () {
    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)->get('/biometric-enrollment')->assertForbidden();
});
