<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Seminars;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('administrator can open system dashboard', function () {
    $admin = User::factory()->asAdministrator()->create();

    $this->actingAs($admin)
        ->get(route('admin.system-dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/system-performance-dashboard')
            ->has('accountMetrics')
            ->has('workflowMetrics')
            ->has('auditMetrics')
            ->has('trainingMetrics')
            ->has('recentAuditLogs'));
});

test('system dashboard returns expected metrics', function () {
    $admin = User::factory()->asAdministrator()->create();
    User::factory()->count(2)->create();
    User::factory()->asHrPersonnel()->create();
    User::factory()->asEvaluator()->create();
    User::factory()->create([
        'is_active' => false,
        'email_verified_at' => null,
    ]);

    LeaveRequest::query()->create([
        'user_id' => User::factory()->create()->id,
        'leave_type' => 'vacation_leave',
        'start_date' => '2026-03-10',
        'end_date' => '2026-03-12',
        'reason' => 'Vacation',
        'status' => 'routed',
        'stage' => 'sent_to_department_head',
        'days_requested' => 3,
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-002',
        'name' => 'Employee 002',
        'job_title' => 'Analyst',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => 'EMP-002',
        'status' => 'completed',
        'stage' => 'data_saved',
        'routing_action' => 'save_data',
        'confidence_pct' => 91.5,
    ]);

    IwrAuditLog::query()->create([
        'logged_at' => now(),
        'employee_id' => 'EMP-002',
        'document_type' => 'ipcr',
        'document_id' => 1,
        'routing_action' => 'save_data',
        'confidence_pct' => 91.5,
        'compliance_passed' => true,
    ]);

    Seminars::query()->create([
        'title' => 'Leadership Workshop',
        'description' => 'Leadership',
        'location' => 'Main Hall',
        'time' => '09:00:00',
        'speaker' => 'Coach',
        'target_performance_area' => 'Leadership',
        'date' => '2026-04-01',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.system-dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('accountMetrics.byRole.administrators', 1)
            ->where('workflowMetrics.leave.routed', 1)
            ->where('workflowMetrics.ipcr.completed', 1)
            ->where('auditMetrics.totalEvents', 1)
            ->where('trainingMetrics.scheduledCount', 1));
});
