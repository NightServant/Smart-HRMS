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
