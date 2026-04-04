<?php

use App\Models\Employee;
use App\Models\User;

test('evaluator can update manual punch access for a subordinate', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-001',
        'name' => 'Eva Evaluator',
        'job_title' => 'Supervisor',
    ]);

    $evaluator = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-EVAL-001',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-SUB-001',
        'name' => 'Sam Subordinate',
        'job_title' => 'Field Officer',
        'supervisor_id' => 'EMP-EVAL-001',
        'manual_punch_enabled' => false,
    ]);

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-001',
        ]), [
            'manual_punch_enabled' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-SUB-001',
        'manual_punch_enabled' => true,
    ]);
});

test('evaluator cannot update manual punch access for a non subordinate employee', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-002',
        'name' => 'Nina Evaluator',
        'job_title' => 'Supervisor',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-999',
        'name' => 'Other Supervisor',
        'job_title' => 'Supervisor',
    ]);

    $evaluator = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-EVAL-002',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-OTHER-001',
        'name' => 'Oscar Outside Team',
        'job_title' => 'Analyst',
        'supervisor_id' => 'EMP-EVAL-999',
        'manual_punch_enabled' => false,
    ]);

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-OTHER-001',
        ]), [
            'manual_punch_enabled' => true,
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-OTHER-001',
        'manual_punch_enabled' => false,
    ]);
});
