<?php

namespace Database\Seeders;

use App\Models\IwrAuditLog;
use App\Models\Notification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Resets the active First Semester 2026 IPCR workflow records so subsequent
 * seeders (notably IpcrApprovedTargetsSeeder) can establish a clean,
 * realistic state.
 *
 * The seeder no longer creates targets or submissions itself: at this stage
 * of the cycle, employees have only set their First Semester 2026 targets
 * (handled exclusively by IpcrApprovedTargetsSeeder) — there are no
 * self-evaluations with actual accomplishments yet, and no mixed-state
 * draft/rejected/pending records. Past-period finalized submissions seeded
 * by HistoricalPerformanceSeeder are preserved.
 */
class IpcrWorkflowSeeder extends Seeder
{
    private const TARGET_YEAR = 2026;

    private const TARGET_SEMESTER = 1;

    public function run(): void
    {
        $this->resetCurrentPeriodWorkflow();
    }

    /**
     * Wipe current-period workflow records and IPCR audit/notification trails
     * so the seeder can be re-run idempotently. Historical finalized
     * submissions seeded by HistoricalPerformanceSeeder are preserved.
     */
    private function resetCurrentPeriodWorkflow(): void
    {
        DB::table('ipcr_appeals')
            ->whereIn('ipcr_submission_id', function ($q): void {
                $q->select('id')
                    ->from('ipcr_submissions')
                    ->where('stage', '!=', 'finalized');
            })
            ->delete();

        DB::table('ipcr_submissions')
            ->where('stage', '!=', 'finalized')
            ->delete();

        DB::table('ipcr_targets')
            ->where('semester', self::TARGET_SEMESTER)
            ->where('target_year', self::TARGET_YEAR)
            ->delete();

        IwrAuditLog::query()
            ->whereIn('document_type', ['ipcr', 'ipcr_target'])
            ->delete();

        Notification::query()
            ->where(function ($query): void {
                $query->where('type', 'like', 'ipcr%')
                    ->orWhere(function ($inner): void {
                        $inner->where('type', 'training_suggestion')
                            ->where('document_type', 'ipcr');
                    });
            })
            ->delete();
    }
}
