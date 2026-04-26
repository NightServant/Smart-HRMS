<?php

namespace App\Console\Commands;

use App\Services\Biometric\BiometricSyncService;
use Illuminate\Console\Command;

class BiometricSync extends Command
{
    protected $signature = 'biometric:sync
        {--device= : Device serial number (defaults to the configured default terminal)}
        {--since= : Override the start_time cursor (Y-m-d H:i:s)}';

    protected $description = 'Pull new biometric transactions from ZKBio Time and update attendance.';

    public function handle(BiometricSyncService $service): int
    {
        $deviceOption = $this->option('device');
        $sinceOption = $this->option('since');

        $device = is_string($deviceOption) && $deviceOption !== '' ? $deviceOption : null;
        $since = is_string($sinceOption) && $sinceOption !== '' ? $sinceOption : null;

        $result = $service->sync($device, $since);

        if ($result->skipped) {
            $this->warn('Sync skipped: another sync is already running.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Sync complete. fetched=%d stored=%d issues=%d cursor=%s',
            $result->recordsFetched,
            $result->recordsStored,
            $result->issues,
            $result->cursor ?? 'null',
        ));

        if ($result->issueTypes !== []) {
            $this->line('Issue types: '.implode(', ', $result->issueTypes));
        }

        return self::SUCCESS;
    }
}
