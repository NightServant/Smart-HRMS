<?php

use App\Models\IpcrPeriod;
use App\Models\User;

beforeEach(function (): void {
    $this->hrUser = User::factory()->asHrPersonnel()->create();
});

it('opens the next eligible target period without an override reason', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/target-notify', [
        'semester' => 1,
        'year' => (int) now()->year,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect(IpcrPeriod::query()->count())->toBe(1);

    $period = IpcrPeriod::query()->first();
    expect($period->type)->toBe(IpcrPeriod::TYPE_TARGET)
        ->and($period->status)->toBe(IpcrPeriod::STATUS_OPEN)
        ->and($period->override_reason)->toBeNull();
});

it('rejects opening an out-of-order target period without a reason', function (): void {
    // Seed history so the next eligible is Sem 2 / 2026.
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/target-notify', [
        'semester' => 1,
        'year' => 2027,
    ]);

    $response->assertSessionHasErrors('override_reason');
    expect(IpcrPeriod::query()->where('year', 2027)->count())->toBe(0);
});

it('opens an out-of-order target period when a reason is supplied and persists it', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/target-notify', [
        'semester' => 1,
        'year' => 2027,
        'override_reason' => 'Re-running for delayed cohort',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    $created = IpcrPeriod::query()
        ->where('type', IpcrPeriod::TYPE_TARGET)
        ->where('year', 2027)
        ->where('semester', 1)
        ->first();

    expect($created)->not->toBeNull()
        ->and($created->override_reason)->toBe('Re-running for delayed cohort')
        ->and($created->status)->toBe(IpcrPeriod::STATUS_OPEN);
});

it('rejects opening an out-of-order evaluation period without a reason', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_EVALUATION,
        'semester' => 1,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/period', [
        'is_open' => true,
        'label' => 'January to June 2027',
        'year' => 2027,
    ]);

    $response->assertSessionHasErrors('override_reason');
});

it('records evaluation period close transitions', function (): void {
    // Open first.
    $this->actingAs($this->hrUser)->post('/admin/ipcr/period', [
        'is_open' => true,
        'label' => 'January to June '.now()->year,
        'year' => (int) now()->year,
    ])->assertRedirect();

    // Then close.
    $this->actingAs($this->hrUser)->post('/admin/ipcr/period', [
        'is_open' => false,
        'label' => 'January to June '.now()->year,
        'year' => (int) now()->year,
    ])->assertRedirect();

    $period = IpcrPeriod::query()
        ->where('type', IpcrPeriod::TYPE_EVALUATION)
        ->first();

    expect($period)->not->toBeNull()
        ->and($period->status)->toBe(IpcrPeriod::STATUS_CLOSED)
        ->and($period->closed_at)->not->toBeNull();
});
