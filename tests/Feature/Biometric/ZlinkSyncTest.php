<?php

use App\Jobs\SyncDepartmentToZlinkJob;
use App\Jobs\SyncEmployeeToZlinkJob;
use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\User;
use App\Services\Biometric\DepartmentSyncService;
use App\Services\Biometric\EmployeeSyncService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Cache::flush();
    Notification::fake();

    config([
        'services.zlink.url' => 'https://zlink-open.test',
        'services.zlink.app_key' => 'test-app-key',
        'services.zlink.app_secret' => 'test-app-secret',
        'services.zlink.portal_root_department_id' => 'zlink-root-dept',
    ]);
});

function fakeZlinkBase(): void
{
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/departments/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['currentPage' => 1, 'totalPages' => 1, 'depts' => []],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/departments' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['departmentId' => 'zlink-dept-1'],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/departments/update' => Http::response([
            'code' => 'ZCOP0000',
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['employeeCode' => 'EMP200'],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/employees/update' => Http::response([
            'code' => 'ZCOP0000',
        ], 200),
    ]);
}

test('creating a department dispatches the Zlink sync job', function () {
    Bus::fake();

    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)->post('/admin/departments', [
        'name' => 'Engineering Office',
    ])->assertRedirect();

    Bus::assertDispatched(SyncDepartmentToZlinkJob::class);
});

test('renaming a department dispatches Zlink sync and re-syncs each employee', function () {
    Bus::fake();

    $department = Department::factory()->create([
        'zlink_department_id' => 'zlink-dept-existing',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-301',
        'name' => 'Alice',
        'job_title' => 'Engineer',
        'department_id' => $department->id,
        'zkteco_pin' => 'EMP301',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-302',
        'name' => 'Bob',
        'job_title' => 'Engineer',
        'department_id' => $department->id,
        'zkteco_pin' => 'EMP302',
    ]);

    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)->put("/admin/departments/{$department->id}", [
        'name' => 'New Engineering Office',
    ])->assertRedirect();

    expect($department->fresh()->name)->toBe('New Engineering Office');

    Bus::assertDispatched(SyncDepartmentToZlinkJob::class, 1);
    Bus::assertDispatched(SyncEmployeeToZlinkJob::class, 2);
});

test('DepartmentSyncService creates a new department when no mapping exists', function () {
    fakeZlinkBase();

    $department = Department::factory()->create();
    app(DepartmentSyncService::class)->sync($department);

    $department->refresh();
    expect($department->zlink_department_id)->toBe('zlink-dept-1');
    expect($department->zlink_sync_status)->toBe('synced');
    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/open-apis/org/v1/departments')
        && $request->method() === 'POST'
        // Zlink's open API requires parentId (ZCOP1002 otherwise).
        && ($request->data()['parentId'] ?? null) === 'zlink-root-dept');
});

test('DepartmentSyncService fails clearly when no root parent department is configured', function () {
    fakeZlinkBase();
    config(['services.zlink.portal_root_department_id' => '']);

    $department = Department::factory()->create();

    expect(fn () => app(DepartmentSyncService::class)->sync($department))
        ->toThrow(RuntimeException::class);

    expect($department->fresh()->zlink_sync_status)->toBe('failed');
    Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/open-apis/org/v1/departments')
        && $request->method() === 'POST');
});

test('DepartmentSyncService updates instead of creating when a mapping already exists', function () {
    fakeZlinkBase();

    $department = Department::factory()->create([
        'zlink_department_id' => 'zlink-dept-existing',
    ]);

    app(DepartmentSyncService::class)->sync($department);

    expect($department->fresh()->zlink_sync_status)->toBe('synced');
    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/open-apis/org/v1/departments/update'));
    Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/open-apis/org/v1/departments')
        && $request->method() === 'POST');
});

test('DepartmentSyncService links to an existing Zlink department by name to avoid duplicates', function () {
    Http::fake([
        'https://zlink-open.test/open-apis/authen/v1/tenantToken/internal' => Http::response([
            'code' => 'ZCOP0000',
            'data' => ['tenantToken' => 't-fake', 'expiresIn' => 3600],
        ], 200),
        'https://zlink-open.test/open-apis/org/v1/departments/search' => Http::response([
            'code' => 'ZCOP0000',
            'data' => [
                'currentPage' => 1,
                'totalPages' => 1,
                'depts' => [['id' => 'zlink-dept-existing', 'name' => 'Finance Office']],
            ],
        ], 200),
    ]);

    $department = Department::factory()->create(['name' => 'Finance Office']);

    $result = app(DepartmentSyncService::class)->sync($department);

    expect($result['action'])->toBe('linked');
    expect($department->fresh()->zlink_department_id)->toBe('zlink-dept-existing');
    Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/open-apis/org/v1/departments')
        && $request->method() === 'POST');
});

test('zkteco_pin is auto-generated from employee_id by stripping dashes', function () {
    expect(EmployeeSyncService::deriveZktecoPin('EMP-002'))->toBe('EMP002');
    expect(EmployeeSyncService::deriveZktecoPin('HR-001'))->toBe('HR001');
    expect(EmployeeSyncService::deriveZktecoPin('PMT-007'))->toBe('PMT007');
});

test('creating an employee assigns a zkteco_pin and dispatches Zlink sync', function () {
    Bus::fake();

    $department = Department::factory()->create([
        'zlink_department_id' => 'zlink-dept-1',
    ]);
    $position = EmployeePosition::query()->create(['name' => 'Analyst II']);

    $hr = User::factory()->asHrPersonnel()->create();

    $this->actingAs($hr)->post('/admin/employee-directory', [
        'name' => 'Maria Santos',
        'email' => 'maria.santos@example.test',
        'department_mode' => 'existing',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'permanent',
        'date_hired' => '2018-01-15',
    ])->assertRedirect();

    $employee = Employee::query()->latest('employee_id')->first();
    expect($employee)->not->toBeNull();
    expect($employee->zkteco_pin)->not->toBeEmpty();
    expect($employee->zkteco_pin)->toBe(str_replace('-', '', $employee->employee_id));
    expect($employee->zlink_sync_status)->toBe('pending');

    Bus::assertDispatched(SyncEmployeeToZlinkJob::class);
});

test('EmployeeSyncService syncs employees to Zlink with derived emp_code', function () {
    fakeZlinkBase();

    $department = Department::factory()->create([
        'zlink_department_id' => 'zlink-dept-1',
    ]);

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-200',
        'name' => 'Maria Santos',
        'job_title' => 'Analyst',
        'department_id' => $department->id,
    ]);

    app(EmployeeSyncService::class)->sync($employee);

    $employee->refresh();
    expect($employee->zkteco_pin)->toBe('EMP200');
    expect($employee->zlink_sync_status)->toBe('synced');

    Http::assertSent(function ($request) {
        if (! str_ends_with($request->url(), '/open-apis/org/v1/employees')) {
            return false;
        }
        $body = $request->data();

        return ($body['employeeCode'] ?? null) === 'EMP200'
            && ($body['firstName'] ?? null) === 'Maria'
            && ($body['lastName'] ?? null) === 'Santos'
            && ($body['departmentId'] ?? null) === 'zlink-dept-1';
    });
});

test('enrolledAtTerminal reflects persisted fingerprint enrollment, not historical punches', function () {
    $department = Department::factory()->create();

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-410',
        'name' => 'No Activity',
        'job_title' => 'Analyst',
        'department_id' => $department->id,
        'zkteco_pin' => 'EMP410',
    ]);

    $user = User::factory()->create([
        'employee_id' => 'EMP-410',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $response = $this->actingAs($user)->get('/attendance');
    $response->assertInertia(fn (Assert $page) => $page
        ->where('enrolledAtTerminal', false)
        ->where('zktecoPinAssigned', true),
    );

    // A historical biometric punch alone must NOT mark the user as enrolled.
    // After explicit fingerprint deletion (which clears fingerprint_enrolled_at)
    // the row history would otherwise resurrect the enrolled state.
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-410',
        'date' => now()->toDateString(),
        'punch_time' => now(),
        'source' => 'biometric',
    ]);

    $response = $this->actingAs($user)->get('/attendance');
    $response->assertInertia(fn (Assert $page) => $page
        ->where('enrolledAtTerminal', false),
    );

    $employee->forceFill(['fingerprint_enrolled_at' => now()])->save();

    $response = $this->actingAs($user)->get('/attendance');
    $response->assertInertia(fn (Assert $page) => $page
        ->where('enrolledAtTerminal', true),
    );
});

test('SyncDepartmentToZlinkJob is a no-op when Zlink credentials are not configured', function () {
    config(['services.zlink.app_key' => '']);
    Http::fake();

    $department = Department::factory()->create();

    (new SyncDepartmentToZlinkJob($department->id))->handle();

    Http::assertNothingSent();
    expect($department->fresh()->zlink_department_id)->toBeNull();
});
