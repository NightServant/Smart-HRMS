<?php

namespace App\Console\Commands;

use App\Jobs\SyncEmployeeToZlinkJob;
use App\Models\Employee;
use Illuminate\Console\Command;

class RetryZlinkEmployeeSync extends Command
{
    protected $signature = 'zlink:retry-employee-sync {--limit=50}';

    protected $description = 'Re-dispatch Zlink employee sync for records stuck in pending or failed state.';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $stuck = Employee::query()
            ->whereIn('zlink_sync_status', ['pending', 'failed'])
            ->orderBy('updated_at')
            ->limit($limit)
            ->pluck('employee_id');

        foreach ($stuck as $employeeId) {
            SyncEmployeeToZlinkJob::dispatch((string) $employeeId);
        }

        $this->info("Re-dispatched Zlink sync for {$stuck->count()} employee(s).");

        return self::SUCCESS;
    }
}
