<?php

use App\Models\Employee;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\User;
use Database\Seeders\LeaveWorkflowSeeder;
use Illuminate\Support\Carbon;

test('leave workflow seeder resets stale rows and repopulates realistic leave processing data', function () {
    $evaluatorEmployee = Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'John Reyes',
        'job_title' => 'Department Head',
    ]);

    User::factory()->asEvaluator()->create([
        'name' => $evaluatorEmployee->name,
        'employee_id' => $evaluatorEmployee->employee_id,
    ]);

    $hrEmployee = Employee::query()->create([
        'employee_id' => 'EMP-900',
        'name' => 'Grace Tan',
        'job_title' => 'HR Officer',
    ]);

    User::factory()->asHrPersonnel()->create([
        'name' => $hrEmployee->name,
        'employee_id' => $hrEmployee->employee_id,
    ]);

    collect(range(2, 7))->each(function (int $suffix): void {
        $employeeId = sprintf('EMP-%03d', 500 + $suffix);
        $name = match ($suffix) {
            2 => 'Maria Santos',
            3 => 'Mark Bautista',
            4 => 'Angela Cruz',
            5 => 'Patricia Garcia',
            6 => 'Kevin Mendoza',
            default => 'Lorraine Flores',
        };

        Employee::query()->create([
            'employee_id' => $employeeId,
            'name' => $name,
            'job_title' => 'Administrative Officer II',
            'supervisor_id' => 'EMP-001',
        ]);

        User::factory()->create([
            'name' => $name,
            'employee_id' => $employeeId,
            'role' => User::ROLE_EMPLOYEE,
        ]);
    });

    LeaveRequest::query()->create([
        'user_id' => User::query()->where('employee_id', 'EMP-502')->value('id'),
        'employee_id' => 'EMP-502',
        'leave_type' => 'vacation_leave',
        'start_date' => '2026-02-01',
        'end_date' => '2026-02-02',
        'reason' => 'Old leave request.',
        'days_requested' => 2,
        'status' => 'pending',
        'stage' => 'draft',
        'dh_decision' => 0,
        'hr_decision' => 0,
        'has_rejection_reason' => 0,
    ]);

    Notification::query()->create([
        'user_id' => User::query()->where('employee_id', 'EMP-502')->value('id'),
        'type' => 'leave_pending_evaluation',
        'title' => 'Old leave request',
        'message' => 'This row should be removed by the seeder.',
        'document_type' => 'leave',
        'document_id' => 9999,
    ]);

    IwrAuditLog::query()->create([
        'logged_at' => Carbon::parse('2026-01-01 08:00:00'),
        'employee_id' => 'EMP-502',
        'document_type' => 'leave',
        'document_id' => 9999,
        'routing_action' => 'submitted',
        'confidence_pct' => 10,
        'compliance_passed' => false,
    ]);

    $this->seed(LeaveWorkflowSeeder::class);

    $eligibleEmployees = User::query()
        ->where('role', User::ROLE_EMPLOYEE)
        ->whereNotNull('employee_id')
        ->count();

    expect(LeaveRequest::query()->count())->toBe($eligibleEmployees)
        ->and(LeaveRequest::query()->where('reason', 'Old leave request.')->doesntExist())->toBeTrue()
        ->and(LeaveRequest::query()->where('status', 'routed')->exists())->toBeTrue()
        ->and(LeaveRequest::query()->where('status', 'completed')->exists())->toBeTrue()
        ->and(LeaveRequest::query()->where('status', 'returned')->exists())->toBeTrue()
        ->and(Notification::query()->where('document_type', 'leave')->exists())->toBeTrue()
        ->and(Notification::query()->where('type', 'leave_completed')->exists())->toBeTrue()
        ->and(IwrAuditLog::query()->where('document_type', 'leave')->where('routing_action', 'finalized')->exists())->toBeTrue();
});
