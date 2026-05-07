<?php

namespace App\Jobs;

use App\Models\Employee;
use App\Services\Biometric\EmployeeSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncEmployeeToZlinkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 30, 90];
    }

    public function __construct(
        private readonly string $employeeId,
    ) {}

    public function handle(): void
    {
        $employee = Employee::query()->find($this->employeeId);

        if ($employee === null) {
            return;
        }

        if ((string) config('services.zlink.app_key', '') === '') {
            // Zlink credentials are not configured in this worker's
            // environment — surface this loudly instead of silently
            // succeeding so the employee never gets pushed to the device.
            Log::warning('Skipping Zlink employee sync: ZLINK_APP_KEY is not configured.', [
                'employee_id' => $this->employeeId,
            ]);

            $employee->forceFill([
                'zlink_sync_status' => 'failed',
                'zlink_sync_error' => 'ZLINK_APP_KEY is not configured in the queue worker environment.',
            ])->save();

            return;
        }

        app(EmployeeSyncService::class)->sync($employee);
    }

    public function failed(Throwable $exception): void
    {
        $employee = Employee::query()->find($this->employeeId);

        if ($employee === null) {
            return;
        }

        $employee->forceFill([
            'zlink_sync_status' => 'failed',
            'zlink_sync_error' => mb_substr($exception->getMessage(), 0, 1000),
        ])->save();
    }
}
