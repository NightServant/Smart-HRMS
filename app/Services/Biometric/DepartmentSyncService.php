<?php

namespace App\Services\Biometric;

use App\Models\ActivityLog;
use App\Models\Department;
use Illuminate\Support\Facades\Log;
use Throwable;

class DepartmentSyncService
{
    public function __construct(
        private readonly ZlinkClient $client,
    ) {}

    /**
     * Sync the given department's name to Zlink. Creates the department in
     * Zlink if no mapping exists, otherwise updates the existing one.
     * Idempotent: looks up by name first to avoid duplicates.
     *
     * @return array{action: 'created'|'updated'|'linked'|'skipped', zlink_department_id: ?string}
     */
    public function sync(Department $department): array
    {
        $name = trim((string) $department->name);

        if ($name === '') {
            return ['action' => 'skipped', 'zlink_department_id' => $department->zlink_department_id];
        }

        try {
            $existingId = (string) ($department->zlink_department_id ?? '');

            if ($existingId !== '') {
                $this->client->updateDepartment($existingId, $name);

                $department->forceFill([
                    'zlink_synced_at' => now(),
                    'zlink_sync_status' => 'synced',
                    'zlink_sync_error' => null,
                ])->save();

                return ['action' => 'updated', 'zlink_department_id' => $existingId];
            }

            $foundId = $this->client->findDepartmentByName($name);

            if ($foundId !== null) {
                $department->forceFill([
                    'zlink_department_id' => $foundId,
                    'zlink_synced_at' => now(),
                    'zlink_sync_status' => 'synced',
                    'zlink_sync_error' => null,
                ])->save();

                return ['action' => 'linked', 'zlink_department_id' => $foundId];
            }

            $newId = $this->client->createDepartment($name);

            $department->forceFill([
                'zlink_department_id' => $newId,
                'zlink_synced_at' => now(),
                'zlink_sync_status' => 'synced',
                'zlink_sync_error' => null,
            ])->save();

            return ['action' => 'created', 'zlink_department_id' => $newId];
        } catch (Throwable $e) {
            $department->forceFill([
                'zlink_sync_status' => 'failed',
                'zlink_sync_error' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();

            Log::warning('Zlink department sync failed.', [
                'department_id' => $department->id,
                'name' => $name,
                'error' => $e->getMessage(),
            ]);

            ActivityLog::log(
                'department.zlink_sync_failed',
                "Zlink sync failed for department \"{$name}\".",
                request(),
                ['department_id' => $department->id, 'error' => $e->getMessage()],
            );

            throw $e;
        }
    }
}
