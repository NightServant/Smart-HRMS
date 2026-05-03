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
     * Push the employee record to Zlink (create or update). Idempotent:
     * Zlink's createEmployee endpoint upserts by employeeCode.
     *
     * @return array{action: 'created'|'updated', emp_code: string}
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

        [$firstName, $lastName] = $this->splitName((string) $employee->name);

        $payload = [
            'employeeCode' => $empCode,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'departmentId' => $zlinkDepartmentId,
        ];

        $action = 'created';

        try {
            try {
                $this->client->createEmployee($payload);
            } catch (Throwable $createException) {
                $message = strtolower($createException->getMessage());
                $alreadyExists = str_contains($message, 'exist')
                    || str_contains($message, 'duplicate')
                    || str_contains($message, 'zcop1004');

                if (! $alreadyExists) {
                    throw $createException;
                }

                $this->client->updateEmployee($payload);
                $action = 'updated';
            }

            $employee->forceFill([
                'zlink_synced_at' => now(),
                'zlink_sync_status' => 'synced',
                'zlink_sync_error' => null,
            ])->save();

            return ['action' => $action, 'emp_code' => $empCode];
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
