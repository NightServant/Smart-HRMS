<?php

namespace App\Services\Biometric;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Http\Client\RequestException;
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
        private readonly ZlinkPortalClient $portal = new ZlinkPortalClient,
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
        $hasPin = ! empty($employee->zkteco_pin);
        $fingerprintCount = 0;

        if ($hasPin) {
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

        // Canonical "enrolled" signal: actual fingerprint template on Zlink
        // OR a biometric punch already exists. A pre-assigned pin alone is
        // not enrollment.
        $fingerCaptured = $fingerprintCount > 0
            || AttendanceRecord::query()
                ->where('employee_id', $employee->employee_id)
                ->where('source', 'biometric')
                ->exists();

        return [
            'enrolled_in_zlink' => $hasPin,
            'finger_captured' => $fingerCaptured,
            'device_user_id' => $hasPin ? (string) $employee->zkteco_pin : null,
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
     * @return array{device_sn: string, device_user_id: string, remote_triggered: bool, instructions: string}
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

        $remoteTriggered = $this->triggerWithBestAvailableTransport($employee, $sn);

        return [
            'device_sn' => $sn,
            'device_user_id' => (string) $employee->zkteco_pin,
            'remote_triggered' => $remoteTriggered,
            'instructions' => $remoteTriggered
                ? $this->instructionsForDevice((string) $employee->zkteco_pin, $sn)
                : $this->manualEnrollmentInstructions((string) $employee->zkteco_pin, $sn),
        ];
    }

    private function manualEnrollmentInstructions(string $deviceUserId, string $deviceSn): string
    {
        return "Remote trigger is unavailable on this Zlink tenant. Ask HR to remote-enroll user ID {$deviceUserId} from the Zlink admin portal, or walk to terminal {$deviceSn}, log in as user ID {$deviceUserId}, and follow the on-device prompts. You'll be marked enrolled automatically after your first biometric punch.";
    }

    /**
     * Try the open-API trigger first; fall back to the customer admin portal
     * client when the open API doesn't expose the endpoint (404). Returns true
     * if either transport succeeded, false if both are unavailable.
     */
    private function triggerWithBestAvailableTransport(Employee $employee, string $deviceSn): bool
    {
        try {
            $this->client->triggerRemoteFingerprintEnrollment($deviceSn, (string) $employee->zkteco_pin);

            return true;
        } catch (RequestException $e) {
            if ($e->response->status() !== 404) {
                throw $e;
            }
        }

        return $this->triggerViaPortal($employee, $deviceSn);
    }

    private function triggerViaPortal(Employee $employee, string $deviceSn): bool
    {
        if (! $this->portal->isConfigured()) {
            Log::info('Zlink portal not configured; falling back to manual on-device enrollment.', [
                'employee_id' => $employee->employee_id,
                'device_sn' => $deviceSn,
            ]);

            return false;
        }

        $portalDeviceId = (string) config('services.zlink.portal_device_id', '');

        if ($portalDeviceId === '') {
            Log::warning('ZLINK_PORTAL_DEVICE_ID not set; cannot call portal remoteRegistration.', [
                'employee_id' => $employee->employee_id,
            ]);

            return false;
        }

        $portalEmployeeId = $this->resolvePortalEmployeeId($employee);

        if ($portalEmployeeId === null) {
            Log::warning('Could not resolve portal employee id; falling back to manual enrollment.', [
                'employee_id' => $employee->employee_id,
            ]);

            return false;
        }

        try {
            $response = $this->portal->triggerRemoteRegistration(
                deviceId: $portalDeviceId,
                employeeId: $portalEmployeeId,
                pin: (string) $employee->zkteco_pin,
            );

            $code = (string) ($response['code'] ?? '');

            // Zlink returns HTTP 200 with a non-success code in the body when
            // the device rejects the trigger (offline, busy, wrong company).
            // Each subsystem has its own success prefix: ZCOP0000 (open API),
            // ZCHC0000 (customer hub), DMSI0000 (device management — what
            // remoteRegistration actually returns when the device accepts the
            // session). All three encode "ok" + a sessionId.
            $successCodes = ['ZCOP0000', 'ZCHC0000', 'DMSI0000'];

            if ($code !== '' && ! in_array($code, $successCodes, true)) {
                Log::warning('Zlink portal remoteRegistration returned non-success code.', [
                    'employee_id' => $employee->employee_id,
                    'portal_employee_id' => $portalEmployeeId,
                    'device_id' => $portalDeviceId,
                    'code' => $code,
                    'message' => $response['message'] ?? null,
                    'data' => $response['data'] ?? null,
                ]);

                return false;
            }

            Log::info('Zlink portal remoteRegistration succeeded.', [
                'employee_id' => $employee->employee_id,
                'portal_employee_id' => $portalEmployeeId,
                'device_id' => $portalDeviceId,
                'response' => $response,
            ]);

            return true;
        } catch (RequestException $e) {
            // Surface a snippet of the response body so a future debugger can
            // tell HTML-from-WAF apart from JSON-from-app without re-tracing.
            $body = $e->response !== null
                ? mb_substr((string) $e->response->body(), 0, 500)
                : null;

            Log::warning('Zlink portal remoteRegistration failed; falling back to manual enrollment.', [
                'employee_id' => $employee->employee_id,
                'portal_employee_id' => $portalEmployeeId,
                'device_id' => $portalDeviceId,
                'http_status' => $e->response?->status(),
                'response_body' => $body,
                'error' => $e->getMessage(),
            ]);

            return false;
        } catch (Throwable $e) {
            Log::warning('Zlink portal remoteRegistration failed; falling back to manual enrollment.', [
                'employee_id' => $employee->employee_id,
                'portal_employee_id' => $portalEmployeeId,
                'device_id' => $portalDeviceId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * The portal API expects Zlink's internal employee UUID, not our local
     * employee_id or the device PIN. Look it up from the open-API employee
     * list using the PIN as employeeCode.
     */
    private function resolvePortalEmployeeId(Employee $employee): ?string
    {
        $pin = (string) $employee->zkteco_pin;

        if ($pin === '') {
            return null;
        }

        try {
            $matches = $this->client->listEmployees($pin);
        } catch (Throwable $e) {
            Log::warning('Could not list employees from open API to resolve portal employee id.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        foreach ($matches as $row) {
            if (($row['employeeCode'] ?? null) === $pin && isset($row['id'])) {
                return (string) $row['id'];
            }
        }

        return null;
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
        } catch (RequestException $e) {
            // Tenants that do not expose the fingerprint search endpoint
            // (e.g. face-only Zlink builds) return 404. We can't verify the
            // count, but failing closed would block all enrollment forever.
            // Fall back to the AttendanceRecord heuristic instead.
            if ($e->response->status() === 404) {
                $this->guardViaAttendanceHistory($employee);

                return;
            }

            Log::warning('Zlink fingerprint lookup failed; refusing remote enrollment to avoid duplicates.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Could not verify enrollment status with Zlink. Please try again in a moment.');
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
     * Fallback duplicate check when Zlink does not expose a fingerprint
     * search endpoint. A confirmed biometric punch is the strongest local
     * signal that the employee already has a template on the device.
     */
    private function guardViaAttendanceHistory(Employee $employee): void
    {
        $hasBiometricPunch = AttendanceRecord::query()
            ->where('employee_id', $employee->employee_id)
            ->where('source', 'biometric')
            ->exists();

        if ($hasBiometricPunch) {
            throw new RuntimeException(
                'You are already enrolled in the biometric terminal. Re-enrolling would create duplicate punches.'
            );
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
