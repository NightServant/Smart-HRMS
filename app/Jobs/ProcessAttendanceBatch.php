<?php

namespace App\Jobs;

use App\Models\BiometricDevice;
use App\Services\Biometric\AttendanceProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

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

    public function handle(AttendanceProcessor $processor): void
    {
        $device = BiometricDevice::query()->findOrFail($this->deviceId);

        $processor->process($device, $this->records);

        if ($this->stamp !== null) {
            $device->forceFill(['last_sync_stamp' => $this->stamp])->save();
        }
    }
}
