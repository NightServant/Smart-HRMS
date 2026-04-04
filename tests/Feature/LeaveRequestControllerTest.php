<?php

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
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
            ->where('leaveHistory.0.leaveAccrual', 0.17));
});

test('leave accrual converts days requested to monthly rate', function () {
    $leaveRequest = new LeaveRequest([
        'days_requested' => 15,
    ]);

    expect($leaveRequest->leaveAccrual())->toBe(1.25);
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
