<?php

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use App\Models\User;

beforeEach(function () {
    config(['services.biometric.enabled' => true]);
});

test('GET handshake returns options text for pre-registered device', function () {
    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $response = $this->get('/api/iclock/cdata?SN=TEST001');

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
    expect($response->getContent())->toContain('GET OPTION FROM: TEST001');
    expect($response->getContent())->toContain('TransFlag=TransData AttLog');
});

test('GET handshake rejects unknown devices', function () {
    $response = $this->get('/api/iclock/cdata?SN=UNKNOWN999');

    $response->assertStatus(403);
    $this->assertDatabaseMissing('biometric_devices', ['serial_number' => 'UNKNOWN999']);
});

test('POST attendance data creates records with source biometric', function () {
    $employee = Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Test Employee',
        'job_title' => 'Tester',
        'zkteco_pin' => '1001',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "{$employee->zkteco_pin}\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";

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
        'zkteco_pin' => '1001',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $firstPunch = "1001\t2026-03-28 08:30:00\t0\t1\t0\t0\t0";
    $secondPunch = "1001\t2026-03-28 08:31:00\t0\t1\t0\t0\t0";

    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1', content: $firstPunch);
    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=2', content: $firstPunch);
    $this->call('POST', '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=3', content: $secondPunch);

    expect(AttendanceRecord::where('employee_id', 'EMP-001')->count())->toBe(2);

    $this->assertDatabaseHas('biometric_sync_issues', [
        'pin' => '1001',
        'issue_type' => 'duplicate_punch',
    ]);
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
        'zkteco_pin' => '1001',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $body = "1001\t2026-03-28 09:30:00\t0\t1\t0\t0\t0";

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

test('device attendance push is written immediately even when the default queue is asynchronous', function () {
    config(['queue.default' => 'database']);

    Employee::create([
        'employee_id' => 'EMP-010',
        'name' => 'Immediate Employee',
        'job_title' => 'Tester',
        'zkteco_pin' => '1010',
    ]);

    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $response = $this->call(
        'POST',
        '/api/iclock/cdata?SN=TEST001&table=ATTLOG&Stamp=1',
        content: "1010\t2026-03-28 08:30:00\t0\t1\t0\t0\t0",
    );

    $response->assertOk();

    $this->assertDatabaseHas('attendance_records', [
        'employee_id' => 'EMP-010',
        'punch_time' => '2026-03-28 08:30:00',
    ]);
});

test('GET handshake requests near real-time pushes from the biometric device', function () {
    BiometricDevice::create([
        'serial_number' => 'TEST001',
        'is_active' => true,
    ]);

    $response = $this->get('/api/iclock/cdata?SN=TEST001');

    $response->assertOk();
    expect($response->getContent())->toContain('Delay=1');
    expect($response->getContent())->toContain('Realtime=1');
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
