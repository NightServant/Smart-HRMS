<?php

namespace App\Services\Biometric;

use App\Models\ActivityLog;
use App\Models\Department;
use Illuminate\Support\Facades\Log;
use RuntimeException;
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

            // Zlink's open API requires parentDeptId (ZCOP1002 otherwise). On
            // this tenant every SHRMS department is a direct child of the
            // company root, so reuse the configured root UUID as the parent.
            $parentId = (string) config('services.zlink.portal_root_department_id', '');

            if ($parentId === '') {
                throw new RuntimeException('ZLINK_PORTAL_ROOT_DEPARTMENT_ID is not configured; Zlink createDepartment requires a parent department id.');
            }

            try {
                $newId = $this->client->createDepartment($name, $parentId);
            } catch (Throwable $createException) {
                // Zlink returns ZCOR0056 "Department duplicated" when a dept
                // with this name already exists but the search endpoint didn't
                // surface it (permission/company scoping). Surface a clear
                // error directing the operator to run the manual-link command
                // instead of silently looping retries.
                $msg = $createException->getMessage();

                if (str_contains($msg, 'ZCOR0056') || str_contains(strtolower($msg), 'duplicated')) {
                    throw new RuntimeException(sprintf(
                        'Department "%s" already exists on Zlink but is not visible to the programmatic list endpoint. Run: php artisan zlink:link-department --name="%s" --zlink-id=<uuid>',
                        $name,
                        $name,
                    ), 0, $createException);
                }

                throw $createException;
            }

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
