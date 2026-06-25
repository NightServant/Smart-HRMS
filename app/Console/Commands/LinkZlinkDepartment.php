<?php

namespace App\Console\Commands;

use App\Models\Department;
use Illuminate\Console\Command;

class LinkZlinkDepartment extends Command
{
    protected $signature = 'zlink:link-department {--name=} {--zlink-id=}';

    protected $description = 'Manually link a local Department row to its Zlink portal UUID. Idempotent — used as a fallback for departments that already exist on Zlink but are not visible to our programmatic department-list endpoint.';

    public function handle(): int
    {
        $name = (string) $this->option('name');
        $zlinkId = (string) $this->option('zlink-id');

        if ($name === '' || $zlinkId === '') {
            $this->error('Both --name and --zlink-id are required.');

            return self::INVALID;
        }

        $dept = Department::query()->where('name', $name)->first();

        if ($dept === null) {
            $this->warn("No local department named \"{$name}\" — nothing to link.");

            return self::SUCCESS;
        }

        if ((string) ($dept->zlink_department_id ?? '') === $zlinkId) {
            $this->info("Department \"{$name}\" already linked to {$zlinkId}.");

            return self::SUCCESS;
        }

        $dept->forceFill([
            'zlink_department_id' => $zlinkId,
            'zlink_synced_at' => now(),
            'zlink_sync_status' => 'synced',
            'zlink_sync_error' => null,
        ])->save();

        $this->info("Linked department \"{$name}\" (#{$dept->id}) -> {$zlinkId}");

        return self::SUCCESS;
    }
}
