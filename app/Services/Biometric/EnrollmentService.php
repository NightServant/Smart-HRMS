<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class EnrollmentService
{
    private const DEPARTMENTS_CACHE_KEY = 'zlink:departments';

    private const DEPARTMENTS_CACHE_TTL_MINUTES = 10;

    public function __construct(
        private readonly ZlinkClient $client,
    ) {}

    public function enroll(Employee $employee, ?string $departmentId = null): EnrollmentResult
    {
        $departmentId = $this->resolveDepartmentId($departmentId);
        $departmentName = $this->departmentNameFor($departmentId);

        if ($employee->zkteco_pin) {
            return new EnrollmentResult(
                employeeId: (string) $employee->employee_id,
                deviceUserId: (string) $employee->zkteco_pin,
                departmentId: $departmentId,
                departmentName: $departmentName,
                status: 'already_enrolled',
                instructions: $this->instructionsFor((string) $employee->zkteco_pin),
            );
        }

        $deviceUserId = $this->pickDeviceUserId($employee);

        $this->client->createEmployee([
            'departmentId' => $departmentId,
            'firstName' => $this->firstName($employee),
            'employeeCode' => $deviceUserId,
        ]);

        $employee->forceFill(['zkteco_pin' => $deviceUserId])->save();

        return new EnrollmentResult(
            employeeId: (string) $employee->employee_id,
            deviceUserId: $deviceUserId,
            departmentId: $departmentId,
            departmentName: $departmentName,
            status: 'pushed',
            instructions: $this->instructionsFor($deviceUserId),
        );
    }

    /**
     * @return array{enrolled_in_zlink: bool, finger_captured: bool, device_user_id: ?string}
     */
    public function verificationStatus(Employee $employee): array
    {
        $enrolled = ! empty($employee->zkteco_pin);

        $fingerCaptured = $enrolled && AttendanceRecord::query()
            ->where('employee_id', $employee->employee_id)
            ->where('source', 'biometric')
            ->exists();

        return [
            'enrolled_in_zlink' => $enrolled,
            'finger_captured' => $fingerCaptured,
            'device_user_id' => $enrolled ? (string) $employee->zkteco_pin : null,
        ];
    }

    /**
     * @return array<int, array{id: string, name: ?string}>
     */
    public function departments(): array
    {
        return Cache::remember(
            self::DEPARTMENTS_CACHE_KEY,
            now()->addMinutes(self::DEPARTMENTS_CACHE_TTL_MINUTES),
            function (): array {
                $rows = $this->client->listDepartments();

                return array_values(array_map(
                    fn (array $row): array => [
                        'id' => (string) ($row['id'] ?? $row['departmentId'] ?? ''),
                        'name' => isset($row['name']) ? (string) $row['name'] : null,
                    ],
                    $rows,
                ));
            },
        );
    }

    private function resolveDepartmentId(?string $departmentId): string
    {
        if ($departmentId !== null && $departmentId !== '') {
            return $departmentId;
        }

        $configured = (string) config('services.zlink.default_department_id', '');

        if ($configured !== '') {
            return $configured;
        }

        $departments = $this->departments();

        if ($departments === []) {
            throw new RuntimeException('No departments available in Zlink. Create one first or set ZLINK_DEFAULT_DEPARTMENT_ID.');
        }

        $first = (string) ($departments[0]['id'] ?? '');

        if ($first === '') {
            throw new RuntimeException('First department from Zlink had no id.');
        }

        return $first;
    }

    private function departmentNameFor(string $id): ?string
    {
        foreach ($this->departments() as $dept) {
            if ($dept['id'] === $id) {
                return $dept['name'];
            }
        }

        return null;
    }

    private function pickDeviceUserId(Employee $employee): string
    {
        $candidate = strtoupper(preg_replace('/[^A-Z0-9]/i', '', (string) $employee->employee_id) ?? '');

        if ($candidate === '') {
            $candidate = 'EMP'.strtoupper(substr(md5((string) $employee->employee_id), 0, 8));
        }

        if (! Employee::query()->where('zkteco_pin', $candidate)->exists()) {
            return $candidate;
        }

        $suffix = 1;

        while (Employee::query()->where('zkteco_pin', $candidate.$suffix)->exists()) {
            $suffix++;
        }

        return $candidate.$suffix;
    }

    private function firstName(Employee $employee): string
    {
        $name = trim((string) $employee->name);

        if ($name === '') {
            return (string) $employee->employee_id;
        }

        // Zlink limits firstName to 32 chars.
        return mb_substr($name, 0, 32);
    }

    private function instructionsFor(string $deviceUserId): string
    {
        return "Visit any biometric terminal connected to your tenant, log in as user ID {$deviceUserId}, and follow the on-device prompts to enroll your fingerprint.";
    }
}
