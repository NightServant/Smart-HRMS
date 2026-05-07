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
        private readonly ZlinkPortalClient $portal,
    ) {}

    /**
     * Resolve a department name to its portal department UUID by walking the
     * SPA's treeNode response. Falls through to null if nothing matches.
     *
     * The open-API equivalent (POST /open-apis/org/v1/departments/search)
     * returns 405 on this tenant — same root cause that motivated routing
     * employee creation through the portal SPA.
     */
    private function findPortalDepartmentByName(string $name): ?string
    {
        $needle = trim(mb_strtolower($name));

        if ($needle === '') {
            return null;
        }

        foreach ($this->portal->listDepartmentTreeNodes() as $row) {
            $rowName = trim(mb_strtolower((string) ($row['name'] ?? '')));

            if ($rowName === $needle) {
                $id = (string) ($row['id'] ?? $row['departmentId'] ?? '');

                if ($id !== '') {
                    return $id;
                }
            }
        }

        return null;
    }

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
                $this->portal->updateDepartment($existingId, $name);

                $department->forceFill([
                    'zlink_synced_at' => now(),
                    'zlink_sync_status' => 'synced',
                    'zlink_sync_error' => null,
                ])->save();

                return ['action' => 'updated', 'zlink_department_id' => $existingId];
            }

            $foundId = $this->findPortalDepartmentByName($name);

            if ($foundId !== null) {
                $department->forceFill([
                    'zlink_department_id' => $foundId,
                    'zlink_synced_at' => now(),
                    'zlink_sync_status' => 'synced',
                    'zlink_sync_error' => null,
                ])->save();

                return ['action' => 'linked', 'zlink_department_id' => $foundId];
            }

            try {
                $newId = $this->portal->createDepartment($name);
            } catch (Throwable $createException) {
                // Zlink returns ZCOR0056 "Department duplicated" when a dept
                // with this name already exists on the portal. Our programmatic
                // session sometimes can't see it via treeNode (the SPA can,
                // but the same auth call from PHP returns an empty tree —
                // suspected company/permission scoping issue). Surface a
                // clear error directing the operator to run the manual-link
                // command instead of silently looping retries.
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
