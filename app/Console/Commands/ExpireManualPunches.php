<?php

namespace App\Console\Commands;

use App\Models\Employee;
use Illuminate\Console\Command;

class ExpireManualPunches extends Command
{
    protected $signature = 'attendance:expire-manual-punches';

    protected $description = 'Disable manual punch access for employees whose end date has passed';

    public function handle(): int
    {
        $expired = Employee::query()
            ->where('manual_punch_enabled', true)
            ->whereNotNull('manual_punch_end_date')
            ->whereDate('manual_punch_end_date', '<', now()->toDateString())
            ->get();

        foreach ($expired as $employee) {
            $employee->update([
                'manual_punch_enabled' => false,
                'manual_punch_reason' => null,
                'manual_punch_start_date' => null,
                'manual_punch_end_date' => null,
            ]);
        }

        $this->info("Disabled manual punch for {$expired->count()} employee(s).");

        return self::SUCCESS;
    }
}
