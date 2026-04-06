<?php

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\IwrService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('leave application page returns leave history data', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-1001',
        'name' => 'Test Employee',
        'job_title' => 'Administrative Aide',
    ]);

    $employeeUser = User::factory()->create([
        'employee_id' => 'EMP-1001',
    ]);

    LeaveRequest::query()->create([
        'user_id' => $employeeUser->id,
        'employee_id' => 'EMP-1001',
        'leave_type' => 'vacation_leave',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-02',
        'days_requested' => 2,
        'reason' => 'Family trip.',
        'status' => 'routed',
        'stage' => 'sent_to_department_head',
        'dh_decision' => 0,
        'hr_decision' => 0,
        'has_rejection_reason' => 0,
    ]);

    $this->actingAs($employeeUser)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->has('leaveHistory', 1)
            ->where('leaveHistory.0.leaveType', 'vacation_leave')
            ->where('leaveHistory.0.stage', 'sent_to_department_head')
            ->where('leaveHistory.0.daysRequested', 2)
            ->where('leaveHistory.0.leaveAccrual', fn ($value) => (float) $value === 2.0));
});

test('leave accrual reflects the actual approved leave days', function () {
    $leaveRequest = new LeaveRequest([
        'days_requested' => 15,
    ]);

    expect($leaveRequest->leaveAccrual())->toBe(15.0);
});

test('employee can submit a leave request', function () {
    Storage::fake('public');
    $employeeUser = User::factory()->create();

    $this->actingAs($employeeUser)
        ->post(route('leave-application.store'), [
            'leaveType' => 'force-leave',
            'startDate' => '2026-03-10',
            'endDate' => '2026-03-12',
            'reason' => 'Planned leave.',
        ])
        ->assertRedirect(route('leave-application'));

    $this->assertDatabaseHas('leave_requests', [
        'user_id' => $employeeUser->id,
        'leave_type' => 'force_leave',
        'start_date' => '2026-03-10 00:00:00',
        'end_date' => '2026-03-12 00:00:00',
        'reason' => 'Planned leave.',
    ]);
});

test('medical certificate is required for sick leave longer than 6 days', function () {
    $employeeUser = User::factory()->create();

    $this->actingAs($employeeUser)
        ->post(route('leave-application.store'), [
            'leaveType' => 'sick-leave',
            'startDate' => '2026-03-01',
            'endDate' => '2026-03-08',
            'reason' => 'Extended recovery.',
        ])
        ->assertSessionHasErrors(['medicalCertificate']);
});

test('paternity leave can upload marriage certificate', function () {
    Storage::fake('public');
    $employeeUser = User::factory()->create();

    $this->actingAs($employeeUser)
        ->post(route('leave-application.store'), [
            'leaveType' => 'paternity-leave',
            'startDate' => '2026-04-01',
            'endDate' => '2026-04-03',
            'reason' => 'Paternity support.',
            'marriageCertificate' => UploadedFile::fake()->create('marriage-certificate.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect(route('leave-application'));

    $this->assertDatabaseHas('leave_requests', [
        'user_id' => $employeeUser->id,
        'leave_type' => 'paternity_leave',
    ]);
});

test('employee sees a workflow error when leave routing is unavailable', function () {
    Storage::fake('public');

    Employee::query()->create([
        'employee_id' => 'EMP-2001',
        'name' => 'Railway Ready',
        'job_title' => 'Administrative Aide',
    ]);

    $employeeUser = User::factory()->create([
        'employee_id' => 'EMP-2001',
    ]);

    $mock = Mockery::mock(IwrService::class);
    $mock->shouldReceive('routeLeave')->once()->andReturn([
        'status' => 'error',
        'notification' => 'IWR service is unavailable. Please try again later.',
    ]);

    app()->instance(IwrService::class, $mock);

    $this->actingAs($employeeUser)
        ->post(route('leave-application.store'), [
            'leaveType' => 'force-leave',
            'startDate' => '2026-03-10',
            'endDate' => '2026-03-12',
            'reason' => 'Planned leave.',
        ])
        ->assertRedirect(route('leave-application'))
        ->assertSessionHasErrors(['workflow']);

    $this->assertDatabaseHas('leave_requests', [
        'user_id' => $employeeUser->id,
        'status' => 'error',
        'notification' => 'IWR service is unavailable. Please try again later.',
    ]);
});

// ---------------------------------------------------------------------------
// Leave credits tests
// ---------------------------------------------------------------------------

test('leave application page passes vlCredits and slCredits props', function () {
    // Hired 12 months ago → 12 × 1.25 = 15.00 days earned, none used
    $hiredDate = Carbon::today()->subMonths(12)->toDateString();

    Employee::query()->create([
        'employee_id' => 'EMP-3001',
        'name' => 'Credits Employee',
        'job_title' => 'Administrative Aide',
        'date_hired' => $hiredDate,
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3001']);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 15.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 15.0)
            ->where('leaveCreditsByType', fn ($credits) => collect($credits)->count() === 9
                && collect($credits)->contains(fn ($item) => $item['value'] === 'vacation-leave' && $item['creditDisplay'] === '15.00 days')
                && collect($credits)->contains(fn ($item) => $item['value'] === 'sick-leave' && $item['creditDisplay'] === '15.00 days')
                && collect($credits)->contains(fn ($item) => $item['value'] === 'maternity-leave' && $item['creditDisplay'] === 'Not specified')
                && collect($credits)->contains(fn ($item) => $item['value'] === 'paternity-leave' && $item['creditDisplay'] === 'Not specified')
                && collect($credits)->contains(fn ($item) => $item['value'] === 'special-sick-leave-women' && $item['creditDisplay'] === '3 months'))
            ->has('holidays'));
});

test('leave credits are reduced by approved vacation leave usage', function () {
    // Hired 24 months ago → 24 × 1.25 = 30.00 days earned
    $hiredDate = Carbon::today()->subMonths(24)->toDateString();

    Employee::query()->create([
        'employee_id' => 'EMP-3002',
        'name' => 'VL Used Employee',
        'job_title' => 'Administrative Aide',
        'date_hired' => $hiredDate,
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3002']);

    // 5 approved vacation leave days used
    LeaveRequest::query()->create([
        'user_id' => $user->id,
        'employee_id' => 'EMP-3002',
        'leave_type' => 'vacation_leave',
        'start_date' => '2025-01-06',
        'end_date' => '2025-01-10',
        'days_requested' => 5,
        'reason' => 'Holiday trip.',
        'status' => 'completed',
        'hr_decision' => 1,
        'dh_decision' => 1,
        'has_rejection_reason' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 25.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 30.0));
});

test('leave credits are reduced by approved sick leave usage', function () {
    $hiredDate = Carbon::today()->subMonths(12)->toDateString();

    Employee::query()->create([
        'employee_id' => 'EMP-3003',
        'name' => 'SL Used Employee',
        'job_title' => 'Administrative Aide',
        'date_hired' => $hiredDate,
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3003']);

    // 3 approved sick leave days used
    LeaveRequest::query()->create([
        'user_id' => $user->id,
        'employee_id' => 'EMP-3003',
        'leave_type' => 'sick_leave',
        'start_date' => '2025-03-03',
        'end_date' => '2025-03-05',
        'days_requested' => 3,
        'reason' => 'Fever.',
        'status' => 'completed',
        'hr_decision' => 1,
        'dh_decision' => 1,
        'has_rejection_reason' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 15.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 12.0));
});

test('special sick leave for women does not reduce regular sick leave credits', function () {
    $hiredDate = Carbon::today()->subMonths(12)->toDateString();

    Employee::query()->create([
        'employee_id' => 'EMP-3006',
        'name' => 'Special Leave Employee',
        'job_title' => 'Administrative Aide',
        'date_hired' => $hiredDate,
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3006']);

    LeaveRequest::query()->create([
        'user_id' => $user->id,
        'employee_id' => 'EMP-3006',
        'leave_type' => 'special_sick_leave_women',
        'start_date' => '2026-03-03',
        'end_date' => '2026-03-05',
        'days_requested' => 3,
        'reason' => 'Qualified gynecological surgery recovery.',
        'status' => 'completed',
        'hr_decision' => 1,
        'dh_decision' => 1,
        'has_rejection_reason' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 15.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 15.0));
});

test('leave credits are zero when employee has no date_hired', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-3004',
        'name' => 'No Hire Date',
        'job_title' => 'Administrative Aide',
        // date_hired intentionally omitted
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3004']);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 0.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 0.0));
});

test('leave credits are zero when user has no linked employee', function () {
    // No employee_id linked
    $user = User::factory()->create(['employee_id' => null]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 0.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 0.0));
});

test('pending or rejected leave requests do not reduce credits', function () {
    $hiredDate = Carbon::today()->subMonths(12)->toDateString();

    Employee::query()->create([
        'employee_id' => 'EMP-3005',
        'name' => 'Pending Only',
        'job_title' => 'Administrative Aide',
        'date_hired' => $hiredDate,
    ]);

    $user = User::factory()->create(['employee_id' => 'EMP-3005']);

    // Pending leave — should NOT deduct
    LeaveRequest::query()->create([
        'user_id' => $user->id,
        'employee_id' => 'EMP-3005',
        'leave_type' => 'vacation_leave',
        'start_date' => '2026-06-01',
        'end_date' => '2026-06-05',
        'days_requested' => 5,
        'reason' => 'Vacation.',
        'status' => 'pending',
        'hr_decision' => 0,
        'dh_decision' => 0,
        'has_rejection_reason' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where('vlCredits', fn ($credits) => (float) $credits === 15.0)
            ->where('slCredits', fn ($credits) => (float) $credits === 15.0));
});

test('holidays prop contains current year holiday strings', function () {
    $user = User::factory()->create(['employee_id' => null]);

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->where(
                'holidays',
                fn ($holidays) => collect($holidays)->contains(now()->year.'-01-01')
                    && collect($holidays)->contains(now()->year.'-12-25'),
            ));
});
