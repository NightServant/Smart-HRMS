<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

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

        // Push the employee to the configured default enrollment terminal so
        // the device recognizes the user ID when they walk up to enroll. If
        // no default device is set, fall back to the manual instruction path.
        $defaultDeviceSn = (string) config('services.zlink.default_device_sn', '');
        $pushedToDevice = false;

        if ($defaultDeviceSn !== '') {
            try {
                $this->client->pushEmployeesToDevice($defaultDeviceSn, [$deviceUserId]);
                $pushedToDevice = true;
            } catch (Throwable $e) {
                Log::warning('Zlink device push failed; user must still walk to a terminal.', [
                    'device_sn' => $defaultDeviceSn,
                    'employee_code' => $deviceUserId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return new EnrollmentResult(
            employeeId: (string) $employee->employee_id,
            deviceUserId: $deviceUserId,
            departmentId: $departmentId,
            departmentName: $departmentName,
            status: $pushedToDevice ? 'pushed_to_device' : 'pushed',
            instructions: $pushedToDevice
                ? $this->instructionsForDevice($deviceUserId, $defaultDeviceSn)
                : $this->instructionsFor($deviceUserId),
        );
    }

    /**
     * @return array{enrolled_in_zlink: bool, finger_captured: bool, device_user_id: ?string, fingerprint_count: int}
     */
    public function verificationStatus(Employee $employee): array
    {
        $enrolled = ! empty($employee->zkteco_pin);
        $fingerprintCount = 0;

        if ($enrolled) {
            try {
                $fingerprints = $this->client->listEmployeeFingerprints((string) $employee->zkteco_pin);
                $fingerprintCount = count($fingerprints);
            } catch (Throwable $e) {
                Log::info('Zlink fingerprint status unavailable; falling back to attendance heuristic.', [
                    'employee_id' => $employee->employee_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $fingerCaptured = $fingerprintCount > 0
            || ($enrolled && AttendanceRecord::query()
                ->where('employee_id', $employee->employee_id)
                ->where('source', 'biometric')
                ->exists());

        return [
            'enrolled_in_zlink' => $enrolled,
            'finger_captured' => $fingerCaptured,
            'device_user_id' => $enrolled ? (string) $employee->zkteco_pin : null,
            'fingerprint_count' => $fingerprintCount,
        ];
    }

    /**
     * Trigger a remote fingerprint capture session for an enrolled employee
     * on the default (or specified) biometric terminal. The terminal will
     * prompt the user to place their finger; the captured template is pushed
     * back to Zlink.
     *
     * Refuses if the employee already has fingerprint templates on Zlink, to
     * prevent duplicate templates that would produce duplicate punches.
     *
     * @return array{device_sn: string, device_user_id: string}
     */
    public function triggerRemoteEnrollment(Employee $employee, ?string $deviceSn = null): array
    {
        if (empty($employee->zkteco_pin)) {
            throw new RuntimeException('Employee has not been registered in Zlink yet.');
        }

        $this->guardAgainstDuplicateEnrollment($employee);

        $sn = $deviceSn !== null && $deviceSn !== ''
            ? $deviceSn
            : (string) config('services.zlink.default_device_sn', '');

        if ($sn === '') {
            throw new RuntimeException('No biometric terminal configured. Set ZLINK_DEFAULT_DEVICE_SN or pass a device serial.');
        }

        $this->client->triggerRemoteFingerprintEnrollment($sn, (string) $employee->zkteco_pin);

        return [
            'device_sn' => $sn,
            'device_user_id' => (string) $employee->zkteco_pin,
        ];
    }

    /**
     * Fail-closed check: refuse if the employee already has fingerprint
     * templates on Zlink, or if the count cannot be verified. Either case
     * could otherwise produce duplicate punches at the terminal.
     */
    private function guardAgainstDuplicateEnrollment(Employee $employee): void
    {
        try {
            $count = count($this->client->listEmployeeFingerprints((string) $employee->zkteco_pin));
        } catch (Throwable $e) {
            Log::warning('Zlink fingerprint lookup failed; refusing remote enrollment to avoid duplicates.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Could not verify enrollment status with Zlink. Please try again in a moment.');
        }

        if ($count > 0) {
            throw new RuntimeException(sprintf(
                'You are already enrolled in the biometric terminal (%d fingerprint%s on file). Re-enrolling would create duplicate punches.',
                $count,
                $count === 1 ? '' : 's',
            ));
        }
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

    private function instructionsForDevice(string $deviceUserId, string $deviceSn): string
    {
        return "Walk to terminal {$deviceSn}, enter user ID {$deviceUserId}, and place your finger on the scanner when prompted. The fingerprint will sync back automatically.";
    }
}
