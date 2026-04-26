<?php

use App\Models\AttendanceRecord;
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

    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'tok'], 200),
        'https://zkbio.test/personnel/api/employees/' => Http::response(['emp_code' => 'EMP-300'], 201),
        'https://zkbio.test/personnel/api/transfer/' => Http::response(['ok' => true], 200),
        'https://zkbio.test/iclock/api/terminals/*' => Http::response([
            'data' => [['sn' => 'TERM-A', 'alias' => 'Lobby']],
            'next' => null,
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

test('employee can self-enroll using only terminal_sn from session identity', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->postJson('/api/biometrics/self-enroll', [
        'terminal_sn' => 'TERM-A',
    ]);

    $response->assertOk();
    $response->assertJsonPath('employee_id', 'EMP-300');
    $response->assertJsonPath('device_user_id', 'EMP-300');

    expect(Employee::query()->find('EMP-300')->zkteco_pin)->toBe('EMP-300');
});

test('employee cannot tamper payload to enroll a different employee', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->postJson('/api/biometrics/self-enroll', [
        'terminal_sn' => 'TERM-A',
        'employee_id' => 'EMP-OTHER',
    ]);

    $response->assertOk();
    $response->assertJsonPath('employee_id', 'EMP-300');

    expect(Employee::query()->find('EMP-OTHER')->zkteco_pin)->toBeNull();
});

test('enrollment-status reports finger_captured once a biometric punch exists', function () {
    Employee::query()->where('employee_id', 'EMP-300')->update(['zkteco_pin' => 'EMP-300']);

    $user = User::factory()->create([
        'employee_id' => 'EMP-300',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->getJson('/api/biometrics/enrollment-status');
    $response->assertOk();
    $response->assertJsonPath('enrolled_in_zkbio', true);
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
