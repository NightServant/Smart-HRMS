<?php

use App\Models\Employee;
use App\Models\User;
use Carbon\Carbon;

function makeEvaluatorWithSubordinate(string $evalId = 'EMP-EVAL-001', string $subId = 'EMP-SUB-001'): array
{
    Employee::query()->create([
        'employee_id' => $evalId,
        'name' => 'Eva Evaluator',
        'job_title' => 'Supervisor',
    ]);

    $evaluator = User::factory()->asEvaluator()->create([
        'employee_id' => $evalId,
    ]);

    $subordinate = Employee::query()->create([
        'employee_id' => $subId,
        'name' => 'Sam Subordinate',
        'job_title' => 'Field Officer',
        'supervisor_id' => $evalId,
        'manual_punch_enabled' => false,
    ]);

    return [$evaluator, $subordinate];
}

// ---------------------------------------------------------------------------
// Enabling with reason + date range
// ---------------------------------------------------------------------------

test('evaluator can enable manual punch with reason and date range', function () {
    [$evaluator] = makeEvaluatorWithSubordinate();

    $today = Carbon::today()->toDateString();
    $nextWeek = Carbon::today()->addWeek()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-001',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => 'Field assignment in remote area',
            'start_date' => $today,
            'end_date' => $nextWeek,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-SUB-001',
        'manual_punch_enabled' => true,
        'manual_punch_reason' => 'Field assignment in remote area',
        'manual_punch_start_date' => $today,
        'manual_punch_end_date' => $nextWeek,
    ]);
});

test('enabling manual punch with future start date sets enabled false until start date', function () {
    [$evaluator] = makeEvaluatorWithSubordinate();

    $tomorrow = Carbon::today()->addDay()->toDateString();
    $nextWeek = Carbon::today()->addWeek()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-001',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => 'Scheduled field work',
            'start_date' => $tomorrow,
            'end_date' => $nextWeek,
        ])
        ->assertRedirect();

    // enabled stays false because today < start_date
    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-SUB-001',
        'manual_punch_enabled' => false,
        'manual_punch_reason' => 'Scheduled field work',
        'manual_punch_start_date' => $tomorrow,
        'manual_punch_end_date' => $nextWeek,
    ]);
});

// ---------------------------------------------------------------------------
// Disabling clears all schedule fields
// ---------------------------------------------------------------------------

test('evaluator can disable manual punch and all schedule fields are cleared', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-010',
        'name' => 'Eva Evaluator',
        'job_title' => 'Supervisor',
    ]);

    $evaluator = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-EVAL-010',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-SUB-010',
        'name' => 'Sam Subordinate',
        'job_title' => 'Field Officer',
        'supervisor_id' => 'EMP-EVAL-010',
        'manual_punch_enabled' => true,
        'manual_punch_reason' => 'Field work',
        'manual_punch_start_date' => Carbon::today()->toDateString(),
        'manual_punch_end_date' => Carbon::today()->addWeek()->toDateString(),
    ]);

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-010',
        ]), [
            'manual_punch_enabled' => false,
        ])
        ->assertRedirect();

    $emp = Employee::query()->find('EMP-SUB-010');
    expect($emp->manual_punch_enabled)->toBeFalse();
    expect($emp->manual_punch_reason)->toBeNull();
    expect($emp->manual_punch_start_date)->toBeNull();
    expect($emp->manual_punch_end_date)->toBeNull();
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('enabling manual punch requires reason', function () {
    [$evaluator] = makeEvaluatorWithSubordinate('EMP-EVAL-020', 'EMP-SUB-020');

    $today = Carbon::today()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-020',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => '',
            'start_date' => $today,
            'end_date' => Carbon::today()->addWeek()->toDateString(),
        ])
        ->assertSessionHasErrors('reason');
});

test('enabling manual punch requires start date on or after today', function () {
    [$evaluator] = makeEvaluatorWithSubordinate('EMP-EVAL-030', 'EMP-SUB-030');

    $yesterday = Carbon::yesterday()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-030',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => 'Field work',
            'start_date' => $yesterday,
            'end_date' => Carbon::today()->addWeek()->toDateString(),
        ])
        ->assertSessionHasErrors('start_date');
});

test('enabling manual punch requires end date on or after start date', function () {
    [$evaluator] = makeEvaluatorWithSubordinate('EMP-EVAL-040', 'EMP-SUB-040');

    $today = Carbon::today()->toDateString();
    $yesterday = Carbon::yesterday()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-040',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => 'Field work',
            'start_date' => $today,
            'end_date' => $yesterday,
        ])
        ->assertSessionHasErrors('end_date');
});

test('reason may not exceed 500 characters', function () {
    [$evaluator] = makeEvaluatorWithSubordinate('EMP-EVAL-050', 'EMP-SUB-050');

    $today = Carbon::today()->toDateString();

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-SUB-050',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => str_repeat('a', 501),
            'start_date' => $today,
            'end_date' => Carbon::today()->addWeek()->toDateString(),
        ])
        ->assertSessionHasErrors('reason');
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

test('evaluator cannot update manual punch access for a non subordinate employee', function () {
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-060',
        'name' => 'Nina Evaluator',
        'job_title' => 'Supervisor',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-EVAL-999',
        'name' => 'Other Supervisor',
        'job_title' => 'Supervisor',
    ]);

    $evaluator = User::factory()->asEvaluator()->create([
        'employee_id' => 'EMP-EVAL-060',
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-OTHER-060',
        'name' => 'Oscar Outside Team',
        'job_title' => 'Analyst',
        'supervisor_id' => 'EMP-EVAL-999',
        'manual_punch_enabled' => false,
    ]);

    $this->actingAs($evaluator)
        ->patch(route('admin.evaluator-attendance.toggle-manual-punch', [
            'employee' => 'EMP-OTHER-060',
        ]), [
            'manual_punch_enabled' => true,
            'reason' => 'Unauthorized attempt',
            'start_date' => Carbon::today()->toDateString(),
            'end_date' => Carbon::today()->addWeek()->toDateString(),
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('employees', [
        'employee_id' => 'EMP-OTHER-060',
        'manual_punch_enabled' => false,
    ]);
});
