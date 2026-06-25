<?php

namespace App\Jobs;

use App\Models\Department;
use App\Services\Biometric\DepartmentSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SyncDepartmentToZlinkJob implements ShouldQueue
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
        private readonly int $departmentId,
    ) {}

    public function handle(): void
    {
        if ((string) config('services.zlink.app_key', '') === '') {
            return;
        }

        $department = Department::query()->find($this->departmentId);

        if ($department === null) {
            return;
        }

        app(DepartmentSyncService::class)->sync($department);
    }

    public function failed(Throwable $exception): void
    {
        $department = Department::query()->find($this->departmentId);

        if ($department === null) {
            return;
        }

        $department->forceFill([
            'zlink_sync_status' => 'failed',
            'zlink_sync_error' => mb_substr($exception->getMessage(), 0, 1000),
        ])->save();
    }
}
