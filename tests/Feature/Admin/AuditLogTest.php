<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('administrator can open audit logs', function () {
    $admin = User::factory()->asAdministrator()->create();

    $this->actingAs($admin)
        ->get(route('admin.audit-logs'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/audit-logs')
            ->has('logs')
            ->has('summary')
            ->has('filters'));
});

test('audit logs show leave and ipcr entries with filters', function () {
    $admin = User::factory()->asAdministrator()->create();

    Employee::query()->create([
        'employee_id' => 'EMP-777',
        'name' => 'Audit Employee',
        'job_title' => 'Analyst',
    ]);

    $leaveRequest = LeaveRequest::query()->create([
        'user_id' => User::factory()->create()->id,
        'employee_id' => 'EMP-777',
        'leave_type' => 'vacation_leave',
        'start_date' => '2026-03-10',
        'end_date' => '2026-03-11',
        'reason' => 'Family trip',
        'status' => 'completed',
        'stage' => 'completed',
        'days_requested' => 2,
    ]);

    $ipcrSubmission = IpcrSubmission::query()->create([
        'employee_id' => 'EMP-777',
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 'route_to_evaluator',
        'confidence_pct' => 58.2,
    ]);

    IwrAuditLog::query()->create([
        'logged_at' => now()->subMinute(),
        'employee_id' => 'EMP-777',
        'document_type' => 'leave',
        'document_id' => $leaveRequest->id,
        'routing_action' => 'completed',
        'confidence_pct' => 95.10,
        'compliance_passed' => true,
    ]);

    IwrAuditLog::query()->create([
        'logged_at' => now(),
        'employee_id' => 'EMP-777',
        'document_type' => 'ipcr',
        'document_id' => $ipcrSubmission->id,
        'routing_action' => 'route_to_evaluator',
        'confidence_pct' => 58.20,
        'compliance_passed' => false,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.audit-logs', ['documentType' => 'ipcr']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.total', 1)
            ->where('summary.ipcrEvents', 1)
            ->where('summary.failedComplianceEvents', 1)
            ->where('logs.0.employeeName', 'Audit Employee')
            ->where('logs.0.documentType', 'ipcr')
            ->where('logs.0.status', 'routed')
            ->where('logs.0.stage', 'sent_to_evaluator'));
});
