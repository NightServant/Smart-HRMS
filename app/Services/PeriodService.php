<?php

namespace App\Services;

use App\Models\IpcrPeriod;
use App\Models\IpcrPeriodExtension;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Centralised lifecycle management for IPCR target and evaluation periods.
 *
 * The `ipcr_periods` table is the system of record for every period the HR
 * personnel has opened or closed. The legacy `system_settings` keys
 * (`ipcr_target_*`, `ipcr_period_*`) remain as a fast lookup for "is the
 * current period open right now", but this service is what derives the next
 * eligible period and persists open/close transitions.
 */
class PeriodService
{
    /**
     * Derive the next eligible period for the given type based on history.
     *
     * Rules:
     *   - If the most recent recorded period is Sem 1 of year Y → next is Sem 2 of year Y.
     *   - If the most recent recorded period is Sem 2 of year Y → next is Sem 1 of year Y+1.
     *   - If there is no history → Sem 1 of the current calendar year.
     *
     * @return array{semester: 1|2, year: int}
     */
    public function deriveNextEligible(string $type): array
    {
        $latest = IpcrPeriod::query()
            ->ofType($type)
            ->orderByDesc('year')
            ->orderByDesc('semester')
            ->first();

        if ($latest === null) {
            return ['semester' => 1, 'year' => (int) now()->year];
        }

        if ($latest->semester === 1) {
            return ['semester' => 2, 'year' => $latest->year];
        }

        return ['semester' => 1, 'year' => $latest->year + 1];
    }

    /**
     * Determine whether opening the requested period would skip ahead of the
     * derived next-eligible period (i.e. opening Sem 1 of year Y+1 while
     * Sem 2 of year Y has not been closed yet).
     */
    public function isOutOfOrder(string $type, int $semester, int $year): bool
    {
        $next = $this->deriveNextEligible($type);

        return $next['semester'] !== $semester || $next['year'] !== $year;
    }

    /**
     * Record that a period has been opened. Creates a new `open` row, or
     * re-opens an existing one (the targeted-extension flow in Phase 2 covers
     * the more common "single user re-submission" case — re-opening a closed
     * period from this method is the bulk override path).
     */
    public function recordOpen(
        string $type,
        int $semester,
        int $year,
        ?int $openedBy = null,
        ?string $overrideReason = null,
    ): IpcrPeriod {
        $period = IpcrPeriod::query()
            ->ofType($type)
            ->forPeriod($semester, $year)
            ->first();

        if ($period === null) {
            return IpcrPeriod::query()->create([
                'type' => $type,
                'semester' => $semester,
                'year' => $year,
                'status' => IpcrPeriod::STATUS_OPEN,
                'opened_at' => Carbon::now(),
                'opened_by' => $openedBy,
                'override_reason' => $overrideReason,
            ]);
        }

        $period->update([
            'status' => IpcrPeriod::STATUS_OPEN,
            'opened_at' => Carbon::now(),
            'opened_by' => $openedBy,
            'closed_at' => null,
            'closed_by' => null,
            'override_reason' => $overrideReason ?? $period->override_reason,
        ]);

        return $period->refresh();
    }

    /**
     * Record that a period has been closed.
     */
    public function recordClose(
        string $type,
        int $semester,
        int $year,
        ?int $closedBy = null,
    ): ?IpcrPeriod {
        $period = IpcrPeriod::query()
            ->ofType($type)
            ->forPeriod($semester, $year)
            ->first();

        if ($period === null) {
            return null;
        }

        $period->update([
            'status' => IpcrPeriod::STATUS_CLOSED,
            'closed_at' => Carbon::now(),
            'closed_by' => $closedBy,
        ]);

        return $period->refresh();
    }

    /**
     * Grant a targeted extension allowing the given employee to submit
     * for the given period after it has been closed globally.
     */
    public function grantExtension(
        IpcrPeriod $period,
        string $employeeId,
        CarbonInterface $expiresAt,
        string $reason,
        ?int $grantedBy = null,
    ): IpcrPeriodExtension {
        return IpcrPeriodExtension::query()->create([
            'period_id' => $period->id,
            'employee_id' => $employeeId,
            'granted_by' => $grantedBy,
            'reason' => $reason,
            'expires_at' => $expiresAt,
        ]);
    }

    public function revokeExtension(
        IpcrPeriodExtension $extension,
        ?int $revokedBy = null,
    ): IpcrPeriodExtension {
        $extension->update([
            'revoked_at' => Carbon::now(),
            'revoked_by' => $revokedBy,
        ]);

        return $extension->refresh();
    }

    /**
     * Check whether the employee has an active (not revoked, not expired)
     * extension for any period of the given type matching the requested
     * semester/year. Used by submit-gate logic.
     */
    /**
     * Record a backfilled period — used by the Phase 3 Historical Entry tool.
     * Creates the period in `backfilled` status if it doesn't already exist;
     * otherwise leaves the existing record alone (we don't downgrade an
     * `open`/`closed` period to `backfilled`).
     */
    public function recordBackfill(
        string $type,
        int $semester,
        int $year,
        ?int $recordedBy = null,
    ): IpcrPeriod {
        $period = IpcrPeriod::query()
            ->ofType($type)
            ->forPeriod($semester, $year)
            ->first();

        if ($period !== null) {
            return $period;
        }

        return IpcrPeriod::query()->create([
            'type' => $type,
            'semester' => $semester,
            'year' => $year,
            'status' => IpcrPeriod::STATUS_BACKFILLED,
            'opened_at' => null,
            'closed_at' => Carbon::now(),
            'opened_by' => $recordedBy,
            'closed_by' => $recordedBy,
        ]);
    }

    public function hasActiveExtension(
        string $type,
        int $semester,
        int $year,
        string $employeeId,
    ): bool {
        return IpcrPeriodExtension::query()
            ->whereHas('period', function ($q) use ($type, $semester, $year): void {
                $q->where('type', $type)
                    ->where('semester', $semester)
                    ->where('year', $year);
            })
            ->where('employee_id', $employeeId)
            ->active()
            ->exists();
    }
}
