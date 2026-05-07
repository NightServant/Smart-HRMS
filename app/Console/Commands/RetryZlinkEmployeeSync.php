<?php

namespace App\Console\Commands;

use App\Jobs\SyncEmployeeToZlinkJob;
use App\Models\Employee;
use Illuminate\Console\Command;

class RetryZlinkEmployeeSync extends Command
{
    protected $signature = 'zlink:retry-employee-sync {--limit=500} {--all : Include records with no sync status yet (post-deploy backfill)}';

    protected $description = 'Re-dispatch Zlink employee sync for records that need syncing — failed, pending, or (with --all) never-attempted.';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $all = (bool) $this->option('all');

        $query = Employee::query()
            ->whereNotNull('department_id')
            ->where(function ($q) use ($all) {
                $q->whereIn('zlink_sync_status', ['pending', 'failed']);

                if ($all) {
                    // Post-deploy backfill: also include employees that were
                    // created before this sync wiring (or before this commit's
                    // multipart fix landed) and never got a sync attempt.
                    $q->orWhereNull('zlink_employee_id');
                }
            })
            ->orderBy('employee_id')
            ->limit($limit);

        $ids = $query->pluck('employee_id');

        foreach ($ids as $employeeId) {
            SyncEmployeeToZlinkJob::dispatch((string) $employeeId);
        }

        $this->info("Re-dispatched Zlink sync for {$ids->count()} employee(s).");

        return self::SUCCESS;
    }
}
