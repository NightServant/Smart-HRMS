<?php

use App\Models\Employee;
use App\Models\IpcrPeriod;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\Notification;
use App\Models\User;

beforeEach(function (): void {
    $this->hrUser = User::factory()->asHrPersonnel()->create();

    $this->employee = Employee::query()->create([
        'employee_id' => 'EMP-HIST-001',
        'name' => 'Historical Subject',
        'job_title' => 'Analyst',
        'supervisor_id' => null,
    ]);

    $this->employeeUser = User::factory()->create(['employee_id' => 'EMP-HIST-001']);
});

it('records a historical target as backfilled and pre-finalized', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/historical-target', [
        'employee_id' => 'EMP-HIST-001',
        'semester' => 2,
        'year' => 2024,
        'note' => 'Imported from paper record.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    $target = IpcrTarget::query()->where('employee_id', 'EMP-HIST-001')->first();
    expect($target)->not->toBeNull()
        ->and($target->semester)->toBe(2)
        ->and($target->target_year)->toBe(2024)
        ->and($target->status)->toBe('submitted')
        ->and($target->evaluator_decision)->toBe('approved')
        ->and($target->hr_finalized)->toBeTrue()
        ->and($target->source)->toBe(IpcrTarget::SOURCE_BACKFILLED);

    $period = IpcrPeriod::query()
        ->where('type', IpcrPeriod::TYPE_TARGET)
        ->where('semester', 2)
        ->where('year', 2024)
        ->first();
    expect($period)->not->toBeNull()
        ->and($period->status)->toBe(IpcrPeriod::STATUS_BACKFILLED);
});

it('does not fire notifications for historical entries', function (): void {
    $this->actingAs($this->hrUser)->post('/admin/ipcr/historical-target', [
        'employee_id' => 'EMP-HIST-001',
        'semester' => 1,
        'year' => 2024,
    ])->assertRedirect();

    expect(
        Notification::query()->where('user_id', $this->employeeUser->id)->count()
    )->toBe(0);
});

it('records a historical evaluation as backfilled and finalized', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/historical-evaluation', [
        'employee_id' => 'EMP-HIST-001',
        'semester' => 1,
        'year' => 2024,
        'final_rating' => 4.25,
        'adjectival_rating' => 'Very Satisfactory',
        'note' => 'Imported from paper record.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    $submission = IpcrSubmission::query()->where('employee_id', 'EMP-HIST-001')->first();
    expect($submission)->not->toBeNull()
        ->and($submission->stage)->toBe('finalized')
        ->and($submission->status)->toBe('finalized')
        ->and($submission->source)->toBe(IpcrSubmission::SOURCE_BACKFILLED)
        ->and((float) $submission->final_rating)->toBe(4.25)
        ->and($submission->finalized_at)->not->toBeNull();

    $period = IpcrPeriod::query()
        ->where('type', IpcrPeriod::TYPE_EVALUATION)
        ->where('semester', 1)
        ->where('year', 2024)
        ->first();
    expect($period)->not->toBeNull()
        ->and($period->status)->toBe(IpcrPeriod::STATUS_BACKFILLED);
});

it('rejects an evaluation rating outside 0..5', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/historical-evaluation', [
        'employee_id' => 'EMP-HIST-001',
        'semester' => 1,
        'year' => 2024,
        'final_rating' => 7,
    ]);

    $response->assertSessionHasErrors('final_rating');
});

it('does not downgrade an existing open period to backfilled', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2024,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now()->subMonth(),
        'closed_at' => now()->subWeek(),
    ]);

    $this->actingAs($this->hrUser)->post('/admin/ipcr/historical-target', [
        'employee_id' => 'EMP-HIST-001',
        'semester' => 1,
        'year' => 2024,
    ])->assertRedirect();

    $period = IpcrPeriod::query()
        ->where('type', IpcrPeriod::TYPE_TARGET)
        ->where('semester', 1)
        ->where('year', 2024)
        ->first();
    expect($period->status)->toBe(IpcrPeriod::STATUS_CLOSED);
});
