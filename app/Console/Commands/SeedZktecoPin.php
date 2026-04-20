<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedZktecoPin extends Command
{
    protected $signature   = 'zkteco:seed-pins';
    protected $description = 'Set default ZKTeco Person IDs on employees (one-time setup)';

    public function handle(): int
    {
        $pins = [
            'EMP-001' => 'EMP001',
            'EMP-002' => 'EMP002',
            'EMP-003' => 'EMP003',
            'EMP-004' => 'EMP004',
            'EMP-005' => 'EMP005',
            'EMP-006' => 'EMP006',
            'EMP-007' => 'EMP007',
            'EMP-008' => 'EMP008',
            'EMP-009' => 'EMP009',
            'EMP-010' => 'EMP010',
            'EMP-011' => 'EMP011',
            'EMP-012' => 'EMP012',
            'EMP-013' => 'EMP013',
            'EMP-014' => 'EMP014',
            'EMP-015' => 'EMP015',
            'EMP-016' => 'EMP016',
            'EMP-017' => 'EMP017',
            'EMP-018' => 'EMP018',
            'EMP-019' => 'EMP019',
            'EMP-020' => 'EMP020',
        ];

        foreach ($pins as $employeeId => $pin) {
            $updated = DB::table('employees')
                ->where('employee_id', $employeeId)
                ->whereNull('zkteco_pin')
                ->orWhere(function ($q) use ($employeeId) {
                    $q->where('employee_id', $employeeId)->where('zkteco_pin', '1');
                })
                ->update(['zkteco_pin' => $pin]);

            $this->line($updated ? "✓ {$employeeId} → {$pin}" : "– {$employeeId} already set");
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
