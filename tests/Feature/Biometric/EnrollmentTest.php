<?php

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zkbiotime.url' => 'https://zkbio.test',
        'services.zkbiotime.username' => 'admin',
        'services.zkbiotime.password' => 'admin',
        'services.zkbiotime.auth_mode' => 'jwt',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-200',
        'name' => 'Hr Subject',
        'job_title' => 'Analyst',
    ]);
});

function fakeEnrollmentApi(): void
{
    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'tok'], 200),
        'https://zkbio.test/personnel/api/employees/' => Http::response(['emp_code' => 'EMP-200'], 201),
        'https://zkbio.test/personnel/api/transfer/' => Http::response(['ok' => true], 200),
        'https://zkbio.test/iclock/api/terminals/*' => Http::response([
            'data' => [
                ['sn' => 'TERM-A', 'alias' => 'Lobby Terminal'],
            ],
            'next' => null,
        ], 200),
    ]);
}

test('hr personnel can enroll an employee and zkteco_pin is persisted', function () {
    fakeEnrollmentApi();

    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
        'terminal_sn' => 'TERM-A',
    ]);

    $response->assertOk();
    $response->assertJsonPath('status', 'pushed');
    $response->assertJsonPath('device_user_id', 'EMP-200');

    $employee = Employee::query()->find('EMP-200');
    expect($employee->zkteco_pin)->toBe('EMP-200');
});

test('re-enrolling an already enrolled employee is idempotent', function () {
    fakeEnrollmentApi();

    Employee::query()->where('employee_id', 'EMP-200')->update(['zkteco_pin' => 'EMP-200']);

    $hr = User::factory()->asHrPersonnel()->create();

    $response = $this->actingAs($hr)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
        'terminal_sn' => 'TERM-A',
    ]);

    $response->assertOk();
    $response->assertJsonPath('status', 'already_enrolled');

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/personnel/api/employees/'));
});

test('employee role cannot call the hr enroll endpoint', function () {
    fakeEnrollmentApi();

    $employee = User::factory()->create([
        'employee_id' => 'EMP-200',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($employee)->postJson('/api/biometrics/enroll', [
        'employee_id' => 'EMP-200',
        'terminal_sn' => 'TERM-A',
    ]);

    $response->assertForbidden();
});
