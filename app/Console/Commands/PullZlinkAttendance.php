<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use App\Services\Biometric\ZlinkClient;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pull attendance punch records from the Zlink open API and persist them
 * idempotently in attendance_records (deduplicated by the unique index on
 * (employee_id, punch_time)). Designed to run every minute via the scheduler.
 *
 * Field mapping from Zlink att response:
 *   - employeeCode → employees.zkteco_pin → employee_id
 *   - checkTime    → punch_time (format: Y-m-d H:i:s)
 *
 * Skips records whose employeeCode has no matching local employee and logs
 * the mismatch so HR can resolve it without silently dropping data.
 */
class PullZlinkAttendance extends Command
{
    protected $signature = 'attendance:pull-zlink
                            {--since= : Start of the pull window (Y-m-d H:i:s). Defaults to 2 minutes ago.}
                            {--until= : End of the pull window (Y-m-d H:i:s). Defaults to now.}';

    protected $description = 'Pull attendance transactions from the Zlink open API and store them locally';

    public function __construct(
        private readonly AttendanceAggregator $aggregator,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $client = ZlinkClient::fromConfig();
        } catch (Throwable $e) {
            Log::warning('PullZlinkAttendance: Zlink client not configured; skipping.', [
                'error' => $e->getMessage(),
            ]);

            return self::SUCCESS;
        }

        // Default window: 2 minutes ago → now. Running every minute with a 2
        // minute lookback gives a 1-minute overlap that prevents a dropped run
        // from creating a gap. Idempotency is guaranteed by insertOrIgnore on
        // the (employee_id, punch_time) unique index.
        $since = $this->option('since') !== null
            ? Carbon::parse((string) $this->option('since'))
            : Carbon::now()->subMinutes(2);

        $until = $this->option('until') !== null
            ? Carbon::parse((string) $this->option('until'))
            : Carbon::now();

        try {
            $transactions = $client->listAttendanceTransactions($since, $until);
        } catch (Throwable $e) {
            Log::error('PullZlinkAttendance: failed to fetch transactions.', [
                'since' => $since->toDateTimeString(),
                'until' => $until->toDateTimeString(),
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }

        if ($transactions === []) {
            return self::SUCCESS;
        }

        $stored = 0;
        $skipped = 0;
        $datesTouched = [];

        foreach ($transactions as $row) {
            $employeeCode = trim((string) ($row['employeeCode'] ?? ''));
            $checkTime = trim((string) ($row['checkTime'] ?? ''));

            if ($employeeCode === '' || $checkTime === '') {
                continue;
            }

            $employee = Employee::query()
                ->where('zkteco_pin', $employeeCode)
                ->first();

            if ($employee === null) {
                Log::warning('PullZlinkAttendance: no employee matched employeeCode; skipping punch.', [
                    'employee_code' => $employeeCode,
                    'check_time' => $checkTime,
                ]);
                $skipped++;

                continue;
            }

            try {
                $punchTime = Carbon::parse($checkTime);
            } catch (Throwable $e) {
                Log::warning('PullZlinkAttendance: could not parse checkTime; skipping.', [
                    'employee_code' => $employeeCode,
                    'check_time' => $checkTime,
                    'error' => $e->getMessage(),
                ]);
                $skipped++;

                continue;
            }

            // insertOrIgnore relies on the unique index (employee_id, punch_time)
            // created by migration 2026_03_24_100000. Duplicate punches from
            // overlapping pull windows are silently dropped — no separate check
            // needed.
            $inserted = AttendanceRecord::query()->insertOrIgnore([
                'employee_id' => $employee->employee_id,
                'date' => $punchTime->toDateString(),
                'punch_time' => $punchTime,
                'status' => null,
                'source' => 'biometric',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($inserted === 1) {
                $stored++;
                $datesTouched[] = [
                    'employee_id' => $employee->employee_id,
                    'date' => CarbonImmutable::parse($punchTime->toDateString()),
                ];
            }
        }

        if ($datesTouched !== []) {
            $this->aggregator->recomputeBatch($datesTouched);
        }

        Log::info('PullZlinkAttendance: completed.', [
            'since' => $since->toDateTimeString(),
            'until' => $until->toDateTimeString(),
            'fetched' => count($transactions),
            'stored' => $stored,
            'skipped' => $skipped,
        ]);

        return self::SUCCESS;
    }
}
