<?php

namespace App\Jobs;

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
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
     * @param  array<int, array{pin: int, datetime: string}>  $records
     */
    public function __construct(
        private readonly int $deviceId,
        private readonly array $records,
        private readonly ?string $stamp = null,
    ) {}

    public function handle(): void
    {
        $device = BiometricDevice::findOrFail($this->deviceId);
        $synced = 0;

        foreach ($this->records as $record) {
            $employee = Employee::where('zkteco_pin', $record['pin'])->first();

            if (! $employee) {
                Log::warning('ProcessAttendanceBatch: Unknown PIN', [
                    'pin' => $record['pin'],
                    'device_id' => $this->deviceId,
                ]);

                continue;
            }

            try {
                $punchDateTime = Carbon::parse($record['datetime']);
            } catch (\Exception $e) {
                Log::warning('ProcessAttendanceBatch: Invalid datetime', [
                    'datetime' => $record['datetime'],
                    'pin' => $record['pin'],
                ]);

                continue;
            }

            $status = $punchDateTime->hour >= 9 ? 'Late' : 'Present';

            $created = AttendanceRecord::query()->firstOrCreate(
                [
                    'employee_id' => $employee->employee_id,
                    'punch_time' => $punchDateTime,
                ],
                [
                    'date' => $punchDateTime->toDateString(),
                    'status' => $status,
                    'source' => 'biometric',
                ],
            );

            if ($created->wasRecentlyCreated) {
                $synced++;
            }
        }

        $device->increment('records_synced', $synced);

        if ($this->stamp !== null) {
            $device->update(['last_sync_stamp' => $this->stamp]);
        }
    }
}
