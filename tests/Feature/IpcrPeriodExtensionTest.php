<?php

use App\Models\Employee;
use App\Models\IpcrPeriod;
use App\Models\IpcrPeriodExtension;
use App\Models\Notification;
use App\Models\User;
use App\Services\PeriodService;

beforeEach(function (): void {
    $this->hrUser = User::factory()->asHrPersonnel()->create();

    $this->employeeRecord = Employee::query()->create([
        'employee_id' => 'EMP-EXT-001',
        'name' => 'Test Subject',
        'job_title' => 'Analyst',
        'supervisor_id' => null,
    ]);

    $this->employeeUser = User::factory()->create([
        'employee_id' => 'EMP-EXT-001',
    ]);

    $this->closedTargetPeriod = IpcrPeriod::query()->create([
        'type' => IpcrPeriod::TYPE_TARGET,
        'semester' => 1,
        'year' => 2025,
        'status' => IpcrPeriod::STATUS_CLOSED,
        'opened_at' => now()->subMonth(),
        'closed_at' => now()->subDays(2),
    ]);
});

it('grants an extension and notifies the employee', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/period-extensions', [
        'type' => 'target',
        'semester' => 1,
        'year' => 2025,
        'employee_id' => 'EMP-EXT-001',
        'expires_at' => now()->addDays(7)->toIso8601String(),
        'reason' => 'Medical leave during the original window.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect(IpcrPeriodExtension::query()->count())->toBe(1);

    $ext = IpcrPeriodExtension::query()->first();
    expect($ext->period_id)->toBe($this->closedTargetPeriod->id)
        ->and($ext->employee_id)->toBe('EMP-EXT-001')
        ->and($ext->granted_by)->toBe($this->hrUser->id);

    expect(
        Notification::query()
            ->where('user_id', $this->employeeUser->id)
            ->where('type', 'ipcr_period_extension_granted')
            ->count()
    )->toBe(1);
});

it('rejects granting an extension on an open period', function (): void {
    $this->closedTargetPeriod->update(['status' => IpcrPeriod::STATUS_OPEN]);

    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/period-extensions', [
        'type' => 'target',
        'semester' => 1,
        'year' => 2025,
        'employee_id' => 'EMP-EXT-001',
        'expires_at' => now()->addDays(3)->toIso8601String(),
        'reason' => 'Should fail',
    ]);

    $response->assertSessionHasErrors('period');
    expect(IpcrPeriodExtension::query()->count())->toBe(0);
});

it('rejects expires_at in the past', function (): void {
    $response = $this->actingAs($this->hrUser)->post('/admin/ipcr/period-extensions', [
        'type' => 'target',
        'semester' => 1,
        'year' => 2025,
        'employee_id' => 'EMP-EXT-001',
        'expires_at' => now()->subDay()->toIso8601String(),
        'reason' => 'Past',
    ]);

    $response->assertSessionHasErrors('expires_at');
});

it('detects active vs revoked extensions correctly', function (): void {
    $service = app(PeriodService::class);

    $service->grantExtension(
        $this->closedTargetPeriod,
        'EMP-EXT-001',
        now()->addDays(3),
        'Reason A',
        $this->hrUser->id,
    );

    expect($service->hasActiveExtension(IpcrPeriod::TYPE_TARGET, 1, 2025, 'EMP-EXT-001'))->toBeTrue();

    $ext = IpcrPeriodExtension::query()->latest('id')->first();
    $service->revokeExtension($ext, $this->hrUser->id);

    expect($service->hasActiveExtension(IpcrPeriod::TYPE_TARGET, 1, 2025, 'EMP-EXT-001'))->toBeFalse();
});

it('treats expired extensions as inactive', function (): void {
    $service = app(PeriodService::class);

    // Insert directly with a past expiry (the controller blocks this path,
    // but the service-level check should still flag it).
    IpcrPeriodExtension::query()->create([
        'period_id' => $this->closedTargetPeriod->id,
        'employee_id' => 'EMP-EXT-001',
        'granted_by' => $this->hrUser->id,
        'reason' => 'Stale',
        'expires_at' => now()->subHour(),
    ]);

    expect($service->hasActiveExtension(IpcrPeriod::TYPE_TARGET, 1, 2025, 'EMP-EXT-001'))->toBeFalse();
});

it('revokes via the HTTP route', function (): void {
    $ext = app(PeriodService::class)->grantExtension(
        $this->closedTargetPeriod,
        'EMP-EXT-001',
        now()->addDays(2),
        'Reason',
        $this->hrUser->id,
    );

    $response = $this->actingAs($this->hrUser)->delete("/admin/ipcr/period-extensions/{$ext->id}");

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect($ext->refresh()->revoked_at)->not->toBeNull()
        ->and($ext->revoked_by)->toBe($this->hrUser->id);
});
