<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\BiometricSyncIssue;
use App\Models\Employee;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

class AttendanceProcessor
{
    public function __construct(
        private readonly AttendanceAggregator $aggregator,
    ) {}

    /**
     * @param  array<int, array{pin: string, datetime: string, source?: string}>  $records
     * @return array{stored: int, issues: int, issue_types: array<int, string>, dates_touched: array<int, array{employee_id: string, date: string}>}
     */
    public function process(BiometricDevice $device, array $records): array
    {
        $stored = 0;
        $issueCount = 0;
        $issueTypes = [];
        $datesTouched = [];

        foreach ($records as $record) {
            $pin = trim((string) ($record['pin'] ?? ''));
            $rawDateTime = trim((string) ($record['datetime'] ?? ''));
            $source = (string) ($record['source'] ?? 'biometric');

            $employee = $this->resolveEmployee($pin);

            if (! $employee) {
                $this->recordIssue($device, $pin, $rawDateTime, 'unknown_pin', 'No employee matched this biometric PIN.');
                $issueCount++;
                $issueTypes[] = 'unknown_pin';

                continue;
            }

            try {
                $punchDateTime = Carbon::parse($rawDateTime);
            } catch (Throwable $e) {
                $this->recordIssue($device, $pin, $rawDateTime, 'invalid_datetime', 'The punch timestamp could not be parsed.');
                $issueCount++;
                $issueTypes[] = 'invalid_datetime';

                continue;
            }

            try {
                $created = AttendanceRecord::query()->insertOrIgnore([
                    'employee_id' => $employee->employee_id,
                    'date' => $punchDateTime->toDateString(),
                    'punch_time' => $punchDateTime,
                    'status' => null,
                    'source' => $source,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (Throwable $e) {
                Log::warning('AttendanceProcessor: store_failed', [
                    'employee_id' => $employee->employee_id,
                    'pin' => $pin,
                    'datetime' => $rawDateTime,
                    'message' => $e->getMessage(),
                ]);
                $this->recordIssue($device, $pin, $rawDateTime, 'store_failed', 'The punch could not be written to attendance records.');
                $issueCount++;
                $issueTypes[] = 'store_failed';

                continue;
            }

            if ($created === 1) {
                $stored++;
                $datesTouched[] = [
                    'employee_id' => $employee->employee_id,
                    'date' => $punchDateTime->toDateString(),
                ];

                continue;
            }

            $this->recordIssue($device, $pin, $rawDateTime, 'duplicate_punch', 'A matching punch already exists and was skipped.');
            $issueCount++;
            $issueTypes[] = 'duplicate_punch';
        }

        if ($stored > 0) {
            $device->increment('records_synced', $stored);
            $device->forceFill(['last_activity_at' => now()])->save();
        }

        $this->aggregator->recomputeBatch(array_map(
            fn (array $tuple): array => [
                'employee_id' => $tuple['employee_id'],
                'date' => CarbonImmutable::parse($tuple['date']),
            ],
            $datesTouched,
        ));

        return [
            'stored' => $stored,
            'issues' => $issueCount,
            'issue_types' => array_values(array_unique($issueTypes)),
            'dates_touched' => $datesTouched,
        ];
    }

    private function resolveEmployee(string $pin): ?Employee
    {
        if ($pin === '') {
            return null;
        }

        return Employee::query()
            ->where('zkteco_pin', $pin)
            ->orWhere('employee_id', $pin)
            ->first();
    }

    public function recordIssue(BiometricDevice $device, ?string $pin, ?string $rawDateTime, string $issueType, string $message): void
    {
        BiometricSyncIssue::query()->create([
            'biometric_device_id' => $device->id,
            'pin' => ($pin === null || $pin === '') ? null : $pin,
            'punch_time_raw' => ($rawDateTime === null || $rawDateTime === '') ? null : $rawDateTime,
            'issue_type' => $issueType,
            'message' => $message,
            'occurred_at' => now(),
        ]);
    }
}
