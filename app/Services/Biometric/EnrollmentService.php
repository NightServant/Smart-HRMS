<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Support\Facades\Cache;

class EnrollmentService
{
    private const TERMINALS_CACHE_KEY = 'zkbiotime:terminals';

    private const TERMINALS_CACHE_TTL_MINUTES = 10;

    public function __construct(
        private readonly ZkBioTimeClient $client,
    ) {}

    public function enroll(Employee $employee, string $terminalSn): EnrollmentResult
    {
        $terminalName = $this->terminalNameFor($terminalSn);

        if ($employee->zkteco_pin) {
            return new EnrollmentResult(
                employeeId: (string) $employee->employee_id,
                deviceUserId: (string) $employee->zkteco_pin,
                terminalSn: $terminalSn,
                terminalName: $terminalName,
                status: 'already_enrolled',
                instructions: $this->instructionsFor((string) $employee->zkteco_pin, $terminalName, $terminalSn),
            );
        }

        $deviceUserId = $this->pickDeviceUserId($employee);

        $this->client->createEmployee([
            'emp_code' => $deviceUserId,
            'first_name' => $this->firstName($employee),
            'last_name' => $this->lastName($employee),
        ]);

        $this->client->assignEmployeeToTerminal($deviceUserId, $terminalSn);

        $employee->forceFill(['zkteco_pin' => $deviceUserId])->save();

        return new EnrollmentResult(
            employeeId: (string) $employee->employee_id,
            deviceUserId: $deviceUserId,
            terminalSn: $terminalSn,
            terminalName: $terminalName,
            status: 'pushed',
            instructions: $this->instructionsFor($deviceUserId, $terminalName, $terminalSn),
        );
    }

    /**
     * @return array{enrolled_in_zkbio: bool, finger_captured: bool, device_user_id: ?string}
     */
    public function verificationStatus(Employee $employee): array
    {
        $enrolled = ! empty($employee->zkteco_pin);

        $fingerCaptured = $enrolled && AttendanceRecord::query()
            ->where('employee_id', $employee->employee_id)
            ->where('source', 'biometric')
            ->exists();

        return [
            'enrolled_in_zkbio' => $enrolled,
            'finger_captured' => $fingerCaptured,
            'device_user_id' => $enrolled ? (string) $employee->zkteco_pin : null,
        ];
    }

    /**
     * @return array<int, array{sn: string, alias: ?string}>
     */
    public function terminals(): array
    {
        return Cache::remember(
            self::TERMINALS_CACHE_KEY,
            now()->addMinutes(self::TERMINALS_CACHE_TTL_MINUTES),
            function (): array {
                $terminals = $this->client->listTerminals();

                return array_values(array_map(
                    fn (array $row): array => [
                        'sn' => (string) ($row['sn'] ?? $row['serial_number'] ?? ''),
                        'alias' => isset($row['alias']) ? (string) $row['alias'] : null,
                    ],
                    $terminals,
                ));
            },
        );
    }

    private function terminalNameFor(string $sn): ?string
    {
        foreach ($this->terminals() as $terminal) {
            if ($terminal['sn'] === $sn) {
                return $terminal['alias'];
            }
        }

        return null;
    }

    private function pickDeviceUserId(Employee $employee): string
    {
        $candidate = (string) $employee->employee_id;

        if (! Employee::query()->where('zkteco_pin', $candidate)->exists()) {
            return $candidate;
        }

        $suffix = 1;

        while (Employee::query()->where('zkteco_pin', $candidate.'-'.$suffix)->exists()) {
            $suffix++;
        }

        return $candidate.'-'.$suffix;
    }

    private function firstName(Employee $employee): string
    {
        $parts = preg_split('/\s+/', trim((string) $employee->name));

        return $parts[0] ?? (string) $employee->employee_id;
    }

    private function lastName(Employee $employee): string
    {
        $parts = preg_split('/\s+/', trim((string) $employee->name));

        if ($parts === false || count($parts) <= 1) {
            return '';
        }

        return (string) end($parts);
    }

    private function instructionsFor(string $deviceUserId, ?string $terminalName, string $terminalSn): string
    {
        $location = $terminalName !== null && $terminalName !== ''
            ? "{$terminalName} (SN {$terminalSn})"
            : "terminal {$terminalSn}";

        return "Visit {$location}, log in as user ID {$deviceUserId}, and follow the on-device prompts to enroll your fingerprint.";
    }
}
