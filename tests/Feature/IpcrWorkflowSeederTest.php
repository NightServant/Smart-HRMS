<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\IwrAuditLog;
use App\Models\Notification;
use App\Models\User;
use Database\Seeders\EmployeeSeeder;
use Database\Seeders\IpcrWorkflowSeeder;
use Database\Seeders\UserSeeder;

test('ipcr workflow seeder resets and repopulates target and submission records', function () {
    $this->seed([
        EmployeeSeeder::class,
        UserSeeder::class,
    ]);

    $employee = Employee::query()->findOrFail('EMP-002');
    $userId = User::query()->where('employee_id', $employee->employee_id)->value('id');

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => ['placeholder' => true],
        'status' => 'draft',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'form_payload' => ['placeholder' => true],
        'status' => 'routed',
        'stage' => 'sent_to_hr',
        'routing_action' => 'route_to_hr',
    ]);

    IwrAuditLog::query()->create([
        'logged_at' => now(),
        'employee_id' => $employee->employee_id,
        'document_type' => 'ipcr',
        'document_id' => 999,
        'routing_action' => 'route_to_hr',
        'confidence_pct' => 100,
        'compliance_passed' => true,
    ]);

    Notification::query()->create([
        'user_id' => $userId,
        'type' => 'ipcr_pending_hr_review',
        'title' => 'Seeded IPCR notification',
        'message' => 'This row should be removed by the workflow seeder.',
        'document_type' => 'ipcr',
        'document_id' => 999,
        'is_read' => false,
        'is_important' => false,
    ]);

    $this->seed(IpcrWorkflowSeeder::class);
    $eligibleEmployeeCount = Employee::query()
        ->where('employee_id', '!=', 'EMP-001')
        ->count();

    expect(IpcrTarget::query()->count())->toBe($eligibleEmployeeCount)
        ->and(IpcrSubmission::query()->count())->toBe($eligibleEmployeeCount)
        ->and(IwrAuditLog::query()->whereIn('document_type', ['ipcr', 'ipcr_target'])->count())->toBe(0)
        ->and(Notification::query()->where('type', 'like', 'ipcr%')->count())->toBe(0)
        ->and(IpcrTarget::query()->where('employee_id', 'EMP-001')->doesntExist())->toBeTrue()
        ->and(IpcrSubmission::query()->where('employee_id', 'EMP-001')->doesntExist())->toBeTrue()
        ->and(data_get(
            IpcrSubmission::query()->where('employee_id', 'EMP-002')->firstOrFail()->form_payload,
            'sections.0.rows.0.remarks',
        ))->toContain('Employee records and staffing requests were handled accurately')
        ->and(IpcrTarget::query()->where('status', 'draft')->exists())->toBeTrue()
        ->and(IpcrTarget::query()->where('hr_finalized', true)->exists())->toBeTrue()
        ->and(IpcrSubmission::query()->where('stage', 'appeal_window_open')->exists())->toBeTrue()
        ->and(IpcrSubmission::query()->where('stage', 'sent_to_hr_finalize')->exists())->toBeTrue()
        ->and(IpcrSubmission::query()
            ->where('stage', 'appeal_window_open')
            ->exists())->toBeTrue();
});
