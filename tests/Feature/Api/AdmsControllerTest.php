<?php

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use App\Models\User;

beforeEach(function () {
    config(['services.biometric.enabled' => true]);
});

test('GET handshake creates device and returns options text', function () {
    $response = $this->get('/api/iclock/cdata?SN=TEST001');

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
    expect($response->getContent())->toContain('GET OPTION FROM: TEST001');
    expect($response->getContent())->toContain('TransFlag=TransData AttLog');

    $this->assertDatabaseHas('biometric_devices', [
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);
});

test('POST attendance data creates records with source biometric', function () {
    $employee = Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Test Employee',
        'job_title' => 'Tester',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "EMP-001\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";

    $response = $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $body);

    $response->assertOk();
    expect($response->getContent())->toBe('OK');

    $this->assertDatabaseHas('attendance_records', [
        'employee_id' => 'EMP-001',
        'status' => 'Present',
        'source' => 'biometric',
    ]);
});

test('duplicate push is idempotent', function () {
    Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Test Employee',
        'job_title' => 'Tester',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "EMP-001\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";

    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $body);
    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=2', content: $body);

    expect(AttendanceRecord::where('employee_id', 'EMP-001')->count())->toBe(1);
});

test('unknown PIN is skipped gracefully', function () {
    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "UNKNOWN-ID\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";

    $response = $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $body);

    $response->assertOk();
    expect(AttendanceRecord::count())->toBe(0);
});

test('late detection marks punch after 9AM as Late', function () {
    Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Test Employee',
        'job_title' => 'Tester',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "EMP-001\t2026-03-28 09:30:00\t0\t1\t0\t0\t0";

    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $body);

    $this->assertDatabaseHas('attendance_records', [
        'employee_id' => 'EMP-001',
        'status' => 'Late',
    ]);
});

test('disabled device rejects data', function () {
    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => false,
    ]);

    $body = "EMP-001\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";

    $response = $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $body);

    $response->assertStatus(403);
    expect(AttendanceRecord::count())->toBe(0);
});

test('biometric punch endpoint creates record for logged-in employee', function () {
    $employee = Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Test Employee',
        'job_title' => 'Tester',
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-001',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)
        ->post(route('attendance.biometric-punch'));

    $response->assertRedirect();

    $this->assertDatabaseHas('attendance_records', [
        'employee_id' => 'EMP-001',
        'source' => 'biometric',
    ]);

    $this->assertDatabaseHas('biometric_devices', [
        'serial_number' => 'SIMULATOR',
    ]);
});

test('biometric punch requires authentication', function () {
    $response = $this->post(route('attendance.biometric-punch'));

    $response->assertRedirect(route('login'));
});

test('ADMS endpoints return 404 when disabled', function () {
    config(['services.biometric.enabled' => false]);

    $response = $this->get('/api/iclock/cdata?SN=TEST001');

    $response->assertStatus(404);
});
