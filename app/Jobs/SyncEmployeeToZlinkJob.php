<?php

namespace App\Jobs;

use App\Models\Employee;
use App\Services\Biometric\EmployeeSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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
        if ((string) config('services.zlink.app_key', '') === '') {
            return;
        }

        $employee = Employee::query()->find($this->employeeId);

        if ($employee === null) {
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
