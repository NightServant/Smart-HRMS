<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use Database\Seeders\HistoricalPerformanceSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedHistoricalAttendanceCommand extends Command
{
    protected $signature = 'attendance:seed-historical {--force : Skip the already-seeded marker check and run anyway}';

    protected $description = 'One-time historical attendance backfill for EMP-002..EMP-021. Idempotent: a system_settings marker prevents repeat runs.';

    public function handle(HistoricalPerformanceSeeder $seeder): int
    {
        $alreadySeeded = (bool) SystemSetting::get('historical_attendance_seeded');

        if ($alreadySeeded && ! $this->option('force')) {
            $this->info('Historical attendance already seeded — skipping. Pass --force to override.');

            return self::SUCCESS;
        }

        $this->info('Running historical attendance backfill (wipeAttendance=true, wipeIpcr=false)...');

        $seeder->setCommand($this);
        $seeder->wipeAttendance = true;
        $seeder->wipeIpcr = false;
        $seeder->run();

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'historical_attendance_seeded'],
            [
                'value' => '1',
                'type' => 'boolean',
                'group' => 'attendance',
                'label' => 'Historical Attendance Seeded',
                'description' => 'Set after the one-time historical attendance backfill ran in production.',
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        $this->info('Backfill complete. Marker set — this command is now a no-op on subsequent runs.');

        return self::SUCCESS;
    }
}
