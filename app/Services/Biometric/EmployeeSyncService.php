<?php

namespace App\Services\Biometric;

use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\Employee;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class EmployeeSyncService
{
    public function __construct(
        private readonly ZlinkPortalClient $portal,
        private readonly DepartmentSyncService $departmentSync,
    ) {}

    /**
     * Look up the portal's internal employee UUID for the given employeeCode.
     * Used to backfill `zlink_employee_id` when create returns "duplicate" —
     * the duplicate response doesn't include the existing record's id, so we
     * have to round-trip the portal's employee/list endpoint.
     */
    private function lookupPortalEmployeeId(string $employeeCode): ?string
    {
        return $this->portal->findPortalEmployeeIdByCode($employeeCode);
    }

    /**
     * Generate a Zlink emp_code (zkteco_pin) from an employee_id by stripping
     * non-alphanumerics and uppercasing, e.g. "EMP-002" -> "EMP002".
     */
    public static function deriveZktecoPin(string $employeeId): string
    {
        $candidate = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $employeeId) ?? '');

        if ($candidate === '') {
            $candidate = 'EMP'.strtoupper(substr(md5($employeeId), 0, 8));
        }

        return $candidate;
    }

    /**
     * Ensure the employee has a unique zkteco_pin assigned. Returns the pin.
     */
    public function assignZktecoPin(Employee $employee): string
    {
        if (! empty($employee->zkteco_pin)) {
            return (string) $employee->zkteco_pin;
        }

        $base = self::deriveZktecoPin((string) $employee->employee_id);
        $candidate = $base;
        $suffix = 1;

        while (Employee::query()
            ->where('zkteco_pin', $candidate)
            ->where('employee_id', '!=', $employee->employee_id)
            ->exists()
        ) {
            $candidate = $base.$suffix;
            $suffix++;
        }

        $employee->forceFill(['zkteco_pin' => $candidate])->save();

        return $candidate;
    }

    /**
     * Push the employee record to the Zlink portal.
     *
     * Goes through ZlinkPortalClient::createEmployee — the open API endpoint
     * (POST /open-apis/org/v1/employees) is gated/disabled on this tenant and
     * the dependent /open-apis/org/v1/departments/search returns 405. The SPA
     * portal endpoint (POST /zlink-api/v1.0/zlink/org/employee) is the working
     * path; the same approach already powers remoteRegistration and the v2.0
     * credentials DELETE.
     *
     * Idempotent: if the portal reports a duplicate employeeCode the local
     * record is marked synced without retrying creation.
     *
     * @return array{action: 'created'|'linked', emp_code: string, zlink_employee_id: ?string}
     */
    public function sync(Employee $employee): array
    {
        $empCode = $this->assignZktecoPin($employee);

        $department = $employee->department_id !== null
            ? Department::query()->find($employee->department_id)
            : null;

        if ($department === null) {
            throw new RuntimeException('Employee has no department; cannot sync to Zlink.');
        }

        $zlinkDepartmentId = (string) ($department->zlink_department_id ?? '');

        if ($zlinkDepartmentId === '') {
            $result = $this->departmentSync->sync($department);
            $zlinkDepartmentId = (string) ($result['zlink_department_id'] ?? '');
        }

        if ($zlinkDepartmentId === '') {
            throw new RuntimeException('Department has no Zlink mapping after sync.');
        }

        $designationId = (string) config('services.zlink.default_designation_id', '');

        if ($designationId === '') {
            throw new RuntimeException('ZLINK_DEFAULT_DESIGNATION_ID is not configured.');
        }

        [$firstName, $lastName] = $this->splitName((string) $employee->name);

        $joinDate = $employee->date_hired?->toDateString() ?? now()->toDateString();

        // Email intentionally omitted: Zlink portal enforces a global email
        // uniqueness lock that survives employee resignation, so any stub
        // record we created earlier (or will create in the future) permanently
        // burns its email slot. Biometric attendance doesn't need email; the
        // canonical identity link is `employeeCode` ↔ local `zkteco_pin`.
        $payload = [
            'employeeCode' => $empCode,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'departmentId' => $zlinkDepartmentId,
            'designationId' => $designationId,
            'joinDate' => $joinDate,
        ];

        try {
            $response = $this->portal->createEmployee($payload);
            $code = (string) ($response['code'] ?? '');
            $message = (string) ($response['message'] ?? '');
            $portalEmployeeId = (string) (((array) ($response['data'] ?? []))['id'] ?? '');

            $isSuccess = $portalEmployeeId !== ''
                || $code === 'OMSI0006'
                || stripos($message, 'success') !== false;

            $isDuplicate = ! $isSuccess && (
                str_contains(strtolower($message), 'exist')
                || str_contains(strtolower($message), 'duplicate')
            );

            if (! $isSuccess && ! $isDuplicate) {
                throw new RuntimeException(sprintf(
                    'Zlink portal createEmployee failed: %s (%s)',
                    $message !== '' ? $message : 'unknown error',
                    $code !== '' ? $code : 'no code',
                ));
            }

            $action = $isSuccess ? 'created' : 'linked';

            // On the duplicate path the portal doesn't return the existing
            // record's id, so resolve it ourselves to keep zlink_employee_id
            // populated (needed later for fingerprint enrollment lookups).
            if ($portalEmployeeId === '') {
                $portalEmployeeId = (string) ($this->lookupPortalEmployeeId($empCode) ?? '');
            }

            $update = [
                'zlink_synced_at' => now(),
                'zlink_sync_status' => 'synced',
                'zlink_sync_error' => null,
            ];

            if ($portalEmployeeId !== '') {
                $update['zlink_employee_id'] = $portalEmployeeId;
            }

            $employee->forceFill($update)->save();

            return [
                'action' => $action,
                'emp_code' => $empCode,
                'zlink_employee_id' => $portalEmployeeId !== '' ? $portalEmployeeId : null,
            ];
        } catch (Throwable $e) {
            $employee->forceFill([
                'zlink_sync_status' => 'failed',
                'zlink_sync_error' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();

            Log::warning('Zlink employee sync failed.', [
                'employee_id' => $employee->employee_id,
                'emp_code' => $empCode,
                'error' => $e->getMessage(),
            ]);

            ActivityLog::log(
                'employee.zlink_sync_failed',
                "Zlink sync failed for employee {$employee->name} ({$employee->employee_id}).",
                request(),
                ['employee_id' => $employee->employee_id, 'error' => $e->getMessage()],
            );

            throw $e;
        }
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $fullName): array
    {
        $name = trim($fullName);

        if ($name === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/', $name) ?: [$name];

        if (count($parts) === 1) {
            return [mb_substr($parts[0], 0, 32), ''];
        }

        $last = array_pop($parts);
        $first = implode(' ', $parts);

        return [
            mb_substr($first, 0, 32),
            mb_substr($last, 0, 32),
        ];
    }
}
