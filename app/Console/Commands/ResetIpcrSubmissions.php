<?php

namespace App\Console\Commands;

use App\Models\IpcrSubmission;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetIpcrSubmissions extends Command
{
    protected $signature = 'ipcr:reset-submissions {--force : Skip confirmation prompt}';

    protected $description = 'Delete all IPCR submissions so the evaluation cycle can start clean';

    public function handle(): int
    {
        $count = IpcrSubmission::query()->count();

        if ($count === 0) {
            $this->info('No IPCR submissions to delete.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("This will permanently delete {$count} IPCR submission(s). Continue?")) {
            $this->warn('Aborted.');

            return self::FAILURE;
        }

        DB::transaction(function (): void {
            IpcrSubmission::query()->delete();
        });

        $this->info("Deleted {$count} IPCR submission(s).");

        return self::SUCCESS;
    }
}
