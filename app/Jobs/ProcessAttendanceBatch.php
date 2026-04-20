<?php

namespace App\Jobs;

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\BiometricSyncIssue;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessAttendanceBatch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    /**
     * @param  array<int, array{pin: string, datetime: string}>  $records
     */
    public function __construct(
        private readonly int $deviceId,
        private readonly array $records,
        private readonly ?string $stamp = null,
    ) {}

    public function handle(): void
    {
        $device = BiometricDevice::query()->findOrFail($this->deviceId);
        $synced = 0;

        foreach ($this->records as $record) {
            $pin = trim((string) ($record['pin'] ?? ''));
            $rawDateTime = trim((string) ($record['datetime'] ?? ''));
            $employee = $this->resolveEmployee($pin);

            if (! $employee) {
                Log::warning('ProcessAttendanceBatch: Unknown PIN', [
                    'pin' => $pin,
                    'device_id' => $this->deviceId,
                ]);
                $this->recordIssue($pin, $rawDateTime, 'unknown_pin', 'No employee matched this biometric PIN.');

                continue;
            }

            try {
                $punchDateTime = Carbon::parse($rawDateTime);
            } catch (\Exception $e) {
                Log::warning('ProcessAttendanceBatch: Invalid datetime', [
                    'datetime' => $rawDateTime,
                    'pin' => $pin,
                ]);
                $this->recordIssue($pin, $rawDateTime, 'invalid_datetime', 'The punch timestamp could not be parsed.');

                continue;
            }

            $status = $punchDateTime->hour >= 9 ? 'Late' : 'Present';
            $timestamp = now();

            try {
                $created = AttendanceRecord::query()->insertOrIgnore([
                    'employee_id' => $employee->employee_id,
                    'date' => $punchDateTime->toDateString(),
                    'punch_time' => $punchDateTime,
                    'status' => $status,
                    'source' => 'biometric',
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]);
            } catch (\Throwable $e) {
                Log::warning('ProcessAttendanceBatch: Failed to store attendance record', [
                    'employee_id' => $employee->employee_id,
                    'pin' => $pin,
                    'datetime' => $rawDateTime,
                    'message' => $e->getMessage(),
                ]);
                $this->recordIssue($pin, $rawDateTime, 'store_failed', 'The punch could not be written to attendance records.');

                continue;
            }

            if ($created === 1) {
                $synced++;

                continue;
            }

            $this->recordIssue($pin, $rawDateTime, 'duplicate_punch', 'A matching punch already exists and was skipped.');
        }

        if ($synced > 0) {
            $device->increment('records_synced', $synced);
        }

        if ($this->stamp !== null) {
            $device->update(['last_sync_stamp' => $this->stamp]);
        }
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

    private function recordIssue(string $pin, string $rawDateTime, string $issueType, string $message): void
    {
        BiometricSyncIssue::query()->create([
            'biometric_device_id' => $this->deviceId,
            'pin' => $pin !== '' ? $pin : null,
            'punch_time_raw' => $rawDateTime !== '' ? $rawDateTime : null,
            'issue_type' => $issueType,
            'message' => $message,
            'occurred_at' => now(),
        ]);
    }
}
