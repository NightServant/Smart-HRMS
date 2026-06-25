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
        private readonly ZlinkClient $client,
        private readonly DepartmentSyncService $departmentSync,
    ) {}

    /**
     * Look up Zlink's internal employee id for the given employeeCode. Used to
     * backfill `zlink_employee_id` when create reports a duplicate — the
     * duplicate response doesn't include the existing record's id, so we have
     * to round-trip the open-API employee search.
     */
    private function lookupEmployeeId(string $employeeCode): ?string
    {
        foreach ($this->client->listEmployees($employeeCode) as $row) {
            if (($row['employeeCode'] ?? null) === $employeeCode && isset($row['id'])) {
                return (string) $row['id'];
            }
        }

        return null;
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
     * Push the employee record to Zlink via the public open API
     * (POST /open-apis/org/v1/employees through ZlinkClient).
     *
     * Idempotent: if Zlink reports a duplicate employeeCode the local record
     * is linked to the existing person and marked synced without retrying
     * creation.
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

        // Email intentionally omitted: Zlink enforces a global email
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
            $action = 'created';
            $zlinkEmployeeId = '';

            try {
                $response = $this->client->createEmployee($payload);
                $zlinkEmployeeId = (string) (((array) ($response['data'] ?? []))['id'] ?? '');
            } catch (Throwable $createException) {
                // The open API rejects a duplicate employeeCode with an error
                // code/message. Treat that as "already exists" and link to the
                // existing person; rethrow anything else to the outer handler.
                if (! $this->isDuplicateError($createException->getMessage())) {
                    throw $createException;
                }

                $action = 'linked';

                // The duplicate response carries no id, so resolve it from the
                // existing person to keep zlink_employee_id populated (needed
                // later for fingerprint enrollment lookups).
                $zlinkEmployeeId = (string) ($this->lookupEmployeeId($empCode) ?? '');
            }

            $update = [
                'zlink_synced_at' => now(),
                'zlink_sync_status' => 'synced',
                'zlink_sync_error' => null,
            ];

            if ($zlinkEmployeeId !== '') {
                $update['zlink_employee_id'] = $zlinkEmployeeId;
            }

            $employee->forceFill($update)->save();

            return [
                'action' => $action,
                'emp_code' => $empCode,
                'zlink_employee_id' => $zlinkEmployeeId !== '' ? $zlinkEmployeeId : null,
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
     * Whether a Zlink create error indicates the employeeCode already exists,
     * in which case the sync links to the existing person rather than failing.
     */
    private function isDuplicateError(string $message): bool
    {
        $needle = strtolower($message);

        return str_contains($needle, 'exist')
            || str_contains($needle, 'duplicate');
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
