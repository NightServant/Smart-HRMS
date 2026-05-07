<?php

namespace App\Console\Commands;

use App\Jobs\SyncDepartmentToZlinkJob;
use App\Models\Department;
use Illuminate\Console\Command;

class RetryZlinkDepartmentSync extends Command
{
    protected $signature = 'zlink:retry-department-sync {--limit=200} {--all : Include departments with no sync status yet (post-deploy backfill)}';

    protected $description = 'Re-dispatch Zlink department sync for rows that need syncing — failed, pending, or (with --all) never-attempted.';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $all = (bool) $this->option('all');

        $query = Department::query()
            ->where(function ($q) use ($all) {
                $q->whereIn('zlink_sync_status', ['pending', 'failed']);

                if ($all) {
                    $q->orWhereNull('zlink_department_id');
                }
            })
            ->orderBy('id')
            ->limit($limit);

        $ids = $query->pluck('id');

        foreach ($ids as $id) {
            SyncDepartmentToZlinkJob::dispatch((int) $id);
        }

        $this->info("Re-dispatched Zlink sync for {$ids->count()} department(s).");

        return self::SUCCESS;
    }
}
