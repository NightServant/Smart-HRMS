<?php

use App\Models\IpcrPeriod;
use App\Services\PeriodService;

beforeEach(function (): void {
    $this->service = app(PeriodService::class);
});

it('returns Sem 1 of the current year when there is no period history', function (): void {
    $next = $this->service->deriveNextEligible(IpcrPeriod::TYPE_TARGET);

    expect($next['semester'])->toBe(1)
        ->and($next['year'])->toBe((int) now()->year);
});

it('advances Sem 1 to Sem 2 of the same year', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $next = $this->service->deriveNextEligible(IpcrPeriod::TYPE_TARGET);

    expect($next)->toBe(['semester' => 2, 'year' => 2026]);
});

it('advances Sem 2 to Sem 1 of the next year', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 2,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    $next = $this->service->deriveNextEligible(IpcrPeriod::TYPE_TARGET);

    expect($next)->toBe(['semester' => 1, 'year' => 2027]);
});

it('keeps target and evaluation derivations independent', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 2,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    expect($this->service->deriveNextEligible(IpcrPeriod::TYPE_TARGET))
        ->toBe(['semester' => 1, 'year' => 2027])
        ->and($this->service->deriveNextEligible(IpcrPeriod::TYPE_EVALUATION))
        ->toBe(['semester' => 1, 'year' => (int) now()->year]);
});

it('flags periods that skip ahead as out of order', function (): void {
    IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2026,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now(),
        'closed_at' => now(),
    ]);

    // Next eligible is Sem 2 / 2026. Anything else is out of order.
    expect($this->service->isOutOfOrder(IpcrPeriod::TYPE_TARGET, 2, 2026))->toBeFalse()
        ->and($this->service->isOutOfOrder(IpcrPeriod::TYPE_TARGET, 1, 2027))->toBeTrue()
        ->and($this->service->isOutOfOrder(IpcrPeriod::TYPE_TARGET, 1, 2026))->toBeTrue();
});

it('records a new open period and reuses the row when re-opened', function (): void {
    $first = $this->service->recordOpen(IpcrPeriod::TYPE_TARGET, 1, 2026, openedBy: null);

    expect(IpcrPeriod::query()->count())->toBe(1)
        ->and($first->status)->toBe(IpcrPeriod::STATUS_OPEN);

    $this->service->recordClose(IpcrPeriod::TYPE_TARGET, 1, 2026);
    $reopened = $this->service->recordOpen(
        IpcrPeriod::TYPE_TARGET,
        1,
        2026,
        openedBy: null,
        overrideReason: 'Submissions re-run after audit',
    );

    expect(IpcrPeriod::query()->count())->toBe(1)
        ->and($reopened->status)->toBe(IpcrPeriod::STATUS_OPEN)
        ->and($reopened->override_reason)->toBe('Submissions re-run after audit')
        ->and($reopened->closed_at)->toBeNull();
});
