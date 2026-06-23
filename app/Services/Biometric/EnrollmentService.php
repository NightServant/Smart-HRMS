<?php

namespace App\Services\Biometric;

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

    private const REMOTE_SESSION_CACHE_PREFIX = 'zlink:portal:remote_session:';

    private const REMOTE_SESSION_TTL_MINUTES = 15;

    /**
     * TTL for the short-lived "still enrolled" confirmation cache. Set to 5
     * minutes so that a fingerprint deleted in the Zlink portal is detected
     * within 5 minutes on the next status poll, while most page-load + poll
     * ticks still hit the cache and avoid redundant Zlink round-trips.
     */
    private const ENROLLMENT_CONFIRMED_TTL_MINUTES = 5;

    private const ENROLLMENT_CONFIRMED_CACHE_PREFIX = 'zlink:enrollment:confirmed:';

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
     * @return array{enrolled_in_zlink: bool, finger_captured: bool, device_user_id: ?string, fingerprint_count: int, finger_index: ?int, finger_label: ?string}
     */
    public function verificationStatus(Employee $employee): array
    {
        $hasPin = ! empty($employee->zkteco_pin);

        // Short-lived confirmed-enrollment cache (5 min TTL). Avoids Zlink
        // round-trips on the 3-second poll tick during active sessions, but
        // still detects deletions in the Zlink portal within 5 minutes —
        // unlike the old fast-path that never re-validated after first write.
        if ($hasPin && $employee->fingerprint_enrolled_at !== null) {
            $confirmedKey = self::ENROLLMENT_CONFIRMED_CACHE_PREFIX.$employee->employee_id;

            if (Cache::has($confirmedKey)) {
                $fingerIndex = $employee->fingerprint_finger_index;

                return [
                    'enrolled_in_zlink' => true,
                    'finger_captured' => true,
                    'device_user_id' => (string) $employee->zkteco_pin,
                    'fingerprint_count' => 1,
                    'finger_index' => $fingerIndex,
                    'finger_label' => $fingerIndex !== null ? $this->fingerLabelFor($fingerIndex) : null,
                ];
            }
        }

        $fingerprintCount = 0;
        $fingerIndex = null;

        if ($hasPin) {
            try {
                $fingerprints = $this->client->listEmployeeFingerprints((string) $employee->zkteco_pin);
                $fingerprintCount = count($fingerprints);

                foreach ($fingerprints as $row) {
                    if (isset($row['fingerIndex']) && is_numeric($row['fingerIndex'])) {
                        $fingerIndex = (int) $row['fingerIndex'];
                        break;
                    }
                }

                // DIAG: surface the raw fingerprint rows (including empty
                // results) so we can correlate against the fid we sent to
                // the portal. Empty results are themselves a signal — they
                // reveal that the open API isn't seeing what the SPA UI
                // shows. Remove once the portal `fid` parameter contract
                // is confirmed.
                Log::info('zlink.openapi.listEmployeeFingerprints.result', [
                    'employee_id' => $employee->employee_id,
                    'zkteco_pin' => (string) $employee->zkteco_pin,
                    'count' => $fingerprintCount,
                    'rows' => $fingerprints,
                    'resolved_finger_index' => $fingerIndex,
                ]);
            } catch (Throwable $e) {
                Log::info('Zlink fingerprint status unavailable; falling back to attendance heuristic.', [
                    'employee_id' => $employee->employee_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Second signal: cms/credential/employee/list. This is the canonical
        // "what credentials does this emp_code have?" call — the SPA itself
        // uses it on the biological-template page, and on this tenant it is
        // the only endpoint that consistently returns existing fingerprint
        // templates (the open-API search 404s, fingerprint/devices returns
        // an empty version map). Without this signal a re-mount after a
        // cache miss would falsely report "Not enrolled" for users whose
        // templates already live on the portal.
        if ($hasPin && $fingerprintCount === 0 && $this->portal->isConfigured()) {
            try {
                $credentials = $this->portal->findFingerprintCredentials(
                    (string) $employee->zkteco_pin,
                );

                if ($credentials !== []) {
                    $fingerprintCount = count($credentials);

                    // The credential list carries the finger slot inline as
                    // `signatureIndex`, so we don't need the (null-returning)
                    // versionMap endpoint to label the finger.
                    foreach ($credentials as $credential) {
                        if ($credential['signatureIndex'] !== null) {
                            $fingerIndex ??= $credential['signatureIndex'];
                            break;
                        }
                    }
                }
            } catch (Throwable $e) {
                Log::info('Portal credential/employee/list lookup failed; falling back to next signal.', [
                    'employee_id' => $employee->employee_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Third signal (when the open API doesn't expose fingerprints):
        // ask the portal whether the active remote-registration session has
        // completed. This is the most reliable on-device-capture signal —
        // the SPA itself polls the same endpoint to flip its UI.
        if ($hasPin && $fingerprintCount === 0 && $this->checkActiveRegistrationSession($employee)) {
            $fingerprintCount = 1;
        }

        // Canonical "enrolled" signal: an actual fingerprint template on
        // Zlink. Historical biometric punches are NOT a signal — once a
        // user explicitly deletes their fingerprint, past punches must not
        // resurrect the enrollment on the next status poll.
        $fingerCaptured = $fingerprintCount > 0;

        $confirmedKey = self::ENROLLMENT_CONFIRMED_CACHE_PREFIX.$employee->employee_id;

        if ($fingerCaptured && $hasPin) {
            // Persist the moment we detect enrollment and arm the short-lived
            // confirmation cache. Subsequent calls within the TTL skip Zlink.
            if ($employee->fingerprint_enrolled_at === null) {
                $employee->forceFill([
                    'fingerprint_enrolled_at' => now(),
                    'fingerprint_finger_index' => $fingerIndex,
                ])->save();
            }

            Cache::put(
                $confirmedKey,
                true,
                now()->addMinutes(self::ENROLLMENT_CONFIRMED_TTL_MINUTES),
            );
        } elseif (! $fingerCaptured && $employee->fingerprint_enrolled_at !== null) {
            // Zlink no longer reports a credential for this employee (deleted
            // from the portal). Clear the persisted DB column and the cache so
            // the badge correctly flips back to "Not enrolled".
            $employee->forceFill([
                'fingerprint_enrolled_at' => null,
                'fingerprint_finger_index' => null,
            ])->save();

            Cache::forget($confirmedKey);

            Log::info('Zlink fingerprint no longer present; cleared enrollment for employee.', [
                'employee_id' => $employee->employee_id,
            ]);
        }

        return [
            'enrolled_in_zlink' => $hasPin,
            'finger_captured' => $fingerCaptured,
            'device_user_id' => $hasPin ? (string) $employee->zkteco_pin : null,
            'fingerprint_count' => $fingerprintCount,
            'finger_index' => $fingerIndex,
            'finger_label' => $fingerIndex !== null ? $this->fingerLabelFor($fingerIndex) : null,
        ];
    }

    /**
     * ZK SDK / pyzk fingerIndex convention: 0–4 left hand (pinky→thumb), 5–9
     * right hand (thumb→pinky). Confirmed against the Zlink portal UI on
     * 2026-05-03 — sending fid=9 lights up the Right Pinky slot in the
     * "Manage Authentication Methods" dialog. Anything outside 0–9 falls
     * back to a generic "Finger #N" label.
     */
    private function fingerLabelFor(int $fingerIndex): string
    {
        return match ($fingerIndex) {
            0 => 'Left Pinky',
            1 => 'Left Ring',
            2 => 'Left Middle',
            3 => 'Left Index',
            4 => 'Left Thumb',
            5 => 'Right Thumb',
            6 => 'Right Index',
            7 => 'Right Middle',
            8 => 'Right Ring',
            9 => 'Right Pinky',
            default => 'Finger #'.$fingerIndex,
        };
    }

    /**
     * Poll the portal's remote-registration result endpoint for an active
     * enrollment session. Returns true once the device has captured the
     * fingerprint (and clears the cached sessionId). The portal SPA polls
     * this exact endpoint to flip its own UI, so it's the authoritative
     * "fingerprint is now on device" signal.
     */
    private function checkActiveRegistrationSession(Employee $employee): bool
    {
        if (! $this->portal->isConfigured()) {
            return false;
        }

        $cacheKey = self::REMOTE_SESSION_CACHE_PREFIX.$employee->employee_id;
        $sessionId = Cache::get($cacheKey);

        if (! is_string($sessionId) || $sessionId === '') {
            return false;
        }

        try {
            $response = $this->portal->getRemoteRegistrationResult($sessionId);
        } catch (Throwable $e) {
            Log::info('Zlink portal remoteRegistration result lookup failed.', [
                'employee_id' => $employee->employee_id,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        // Log every response shape so we can confirm the success-state
        // detection. Drop this once the badge flips reliably.
        Log::info('Zlink portal remoteRegistration result.', [
            'employee_id' => $employee->employee_id,
            'session_id' => $sessionId,
            'response_code' => $response['code'] ?? null,
            'data' => $response['data'] ?? null,
        ]);

        $state = $this->interpretRegistrationResult($response);

        // Clear the cache on a terminal state so we don't keep polling a
        // closed session forever.
        if ($state === 'success' || $state === 'failed') {
            Cache::forget($cacheKey);
        }

        return $state === 'success';
    }

    /**
     * Defensive interpretation of the result endpoint's payload. The portal
     * doesn't publish a schema, so accept the common success indicators:
     * - data.success === true
     * - data.status / data.state in a known success vocabulary
     * - data.result === 1
     * - data.finished === true && data.success !== false
     *
     * Treat anything that's clearly "done but not success" as failed; treat
     * everything else as pending so the poll keeps trying.
     *
     * @param  array<string, mixed>  $response
     */
    private function interpretRegistrationResult(array $response): string
    {
        $code = (string) ($response['code'] ?? '');
        // Each Zlink subsystem has its own success prefix: ZCOP (open API),
        // ZCHC (customer hub), DMSI (device management), CMSR (CMS), ZCDC
        // (device cloud — what the result endpoint actually returns).
        $successCodes = ['', 'ZCOP0000', 'ZCHC0000', 'DMSI0000', 'CMSR0000', 'ZCDC0000'];

        // Default unknown codes to "pending" instead of "failed". A new
        // subsystem code we haven't catalogued must not silently terminate
        // an in-flight enrollment session and clear its cached id.
        if (! in_array($code, $successCodes, true)) {
            return 'pending';
        }

        $data = $response['data'] ?? [];

        if (! is_array($data)) {
            return 'pending';
        }

        // ZCDC0000 / device-cloud shape: data.end is "0" while the device is
        // still capturing presses (num counts up 1->2->3) and "1" once the
        // session is closed. data.code is the device's own status code, "0"
        // = ok, anything else = failure (mid-session abort, device offline,
        // etc). This is what the portal SPA actually polls.
        if (array_key_exists('end', $data)) {
            $end = (string) $data['end'];
            $innerCode = (string) ($data['code'] ?? '0');

            if ($end === '1') {
                return $innerCode === '0' ? 'success' : 'failed';
            }

            if ($end === '0') {
                return 'pending';
            }
        }

        if (($data['success'] ?? null) === true) {
            return 'success';
        }

        if (($data['success'] ?? null) === false || ($data['failed'] ?? null) === true) {
            return 'failed';
        }

        $statusValue = mb_strtoupper((string) ($data['status'] ?? $data['state'] ?? ''));

        if (in_array($statusValue, ['SUCCESS', 'COMPLETED', 'FINISHED', 'OK', 'DONE'], true)) {
            return 'success';
        }

        if (in_array($statusValue, ['FAILED', 'CANCELLED', 'CANCELED', 'TIMEOUT', 'EXPIRED', 'ERROR'], true)) {
            return 'failed';
        }

        $resultValue = $data['result'] ?? null;

        if (is_int($resultValue) || (is_string($resultValue) && ctype_digit($resultValue))) {
            $intResult = (int) $resultValue;

            if ($intResult === 1) {
                return 'success';
            }

            if ($intResult < 0) {
                return 'failed';
            }
        }

        if (($data['finished'] ?? null) === true) {
            return ($data['success'] ?? null) === false ? 'failed' : 'success';
        }

        return 'pending';
    }

    /**
     * Delete every fingerprint credential the employee has on Zlink, then
     * clear local enrollment state. Idempotent: returns {deleted: 0} when
     * the employee was already not enrolled. Mirrors what happens when an
     * admin clicks "Delete" on the Zlink portal's biological-template page.
     *
     * @return array{deleted: int, credential_ids: array<int, string>, cleared_locally: bool}
     */
    public function deleteFingerprint(Employee $employee): array
    {
        $clearLocal = function () use ($employee): void {
            $employee->forceFill([
                'fingerprint_enrolled_at' => null,
                'fingerprint_finger_index' => null,
            ])->save();

            Cache::forget(self::ENROLLMENT_CONFIRMED_CACHE_PREFIX.$employee->employee_id);
            Cache::forget(self::REMOTE_SESSION_CACHE_PREFIX.$employee->employee_id);
        };

        if (empty($employee->zkteco_pin)) {
            $clearLocal();

            return ['deleted' => 0, 'credential_ids' => [], 'cleared_locally' => true];
        }

        if (! $this->portal->isConfigured()) {
            Log::warning('Cannot delete fingerprint via Zlink: portal not configured.', [
                'employee_id' => $employee->employee_id,
            ]);

            $clearLocal();

            return ['deleted' => 0, 'credential_ids' => [], 'cleared_locally' => true];
        }

        // Discover credential IDs via the SPA's actual list endpoint
        // (cms/credential/employee/list filtered by employeeCode). The
        // older fingerprint/devices endpoint returns null on this tenant
        // even when credentials exist.
        $credentialIds = [];

        try {
            $credentialIds = $this->portal->findCredentialIdsByEmployeeCode(
                (string) $employee->zkteco_pin,
                bioType: 1,
            );
        } catch (Throwable $e) {
            Log::warning('Could not list Zlink fingerprint credentials before delete.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);
        }

        if ($credentialIds === []) {
            // Nothing on Zlink — local state was likely stale. Clear it and
            // report a clean delete so the UI flips correctly.
            $clearLocal();

            return ['deleted' => 0, 'credential_ids' => [], 'cleared_locally' => true];
        }

        try {
            $this->portal->deleteFingerprintCredentials($credentialIds);
        } catch (Throwable $e) {
            Log::error('Zlink fingerprint delete failed.', [
                'employee_id' => $employee->employee_id,
                'credential_ids' => $credentialIds,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Failed to delete fingerprint on Zlink: '.$e->getMessage(), previous: $e);
        }

        $clearLocal();

        return [
            'deleted' => count($credentialIds),
            'credential_ids' => $credentialIds,
            'cleared_locally' => true,
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
     * @param  int|null  $fingerIndex  ZKTeco finger slot (0–4 right thumb→pinky,
     *                                 5–9 left thumb→pinky). Defaults to config
     *                                 value or 1 (Right Index) when not supplied.
     * @return array{device_sn: string, device_user_id: string, remote_triggered: bool, instructions: string}
     */
    public function triggerRemoteEnrollment(Employee $employee, ?string $deviceSn = null, ?int $fingerIndex = null): array
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

        // Resolve the finger index: caller > config default > 1 (Right Index).
        // Right Index is the most natural enrollment finger for most users and
        // is confirmed to work by the portal's biological-template endpoint.
        $resolvedFingerIndex = $fingerIndex
            ?? (int) config('services.zlink.default_finger_index', 1);

        $remoteTriggered = $this->triggerWithBestAvailableTransport($employee, $sn, $resolvedFingerIndex);

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
    private function triggerWithBestAvailableTransport(Employee $employee, string $deviceSn, int $fingerIndex): bool
    {
        try {
            $this->client->triggerRemoteFingerprintEnrollment($deviceSn, (string) $employee->zkteco_pin, $fingerIndex);

            return true;
        } catch (RequestException $e) {
            if ($e->response->status() !== 404) {
                throw $e;
            }
        }

        return $this->triggerViaPortal($employee, $deviceSn, $fingerIndex);
    }

    private function triggerViaPortal(Employee $employee, string $deviceSn, int $fingerIndex = 1): bool
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
                fid: $fingerIndex,
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

            // Stash the registration sessionId so the enrollment-status poll
            // can ask the portal whether the device has captured a finger
            // yet. This is more reliable than fingerprintVersionMap, which
            // lags the device->cloud sync.
            $sessionId = (string) (($response['data']['results']['sessionId'] ?? '') ?: '');

            if ($sessionId !== '') {
                Cache::put(
                    self::REMOTE_SESSION_CACHE_PREFIX.$employee->employee_id,
                    $sessionId,
                    now()->addMinutes(self::REMOTE_SESSION_TTL_MINUTES),
                );
            }

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
     *
     * Cached for an hour because the enrollment-status poll (every 3s) and
     * the duplicate-enrollment guard would otherwise re-paginate the entire
     * employee list on every call.
     */
    private function resolvePortalEmployeeId(Employee $employee): ?string
    {
        $pin = (string) $employee->zkteco_pin;

        if ($pin === '') {
            return null;
        }

        $cacheKey = 'zlink:portal:employee_id:'.$employee->employee_id;
        $cached = Cache::get($cacheKey);

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        try {
            $matches = $this->client->listEmployees($pin);

            foreach ($matches as $row) {
                if (($row['employeeCode'] ?? null) === $pin && isset($row['id'])) {
                    $id = (string) $row['id'];
                    Cache::put($cacheKey, $id, now()->addHour());

                    return $id;
                }
            }
        } catch (Throwable $e) {
            // Open API may return 405 on some hosting environments (WAF/IP restriction).
            // Fall through to the portal-client fallback below.
            Log::warning('Open API employee lookup failed; trying portal fallback.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);
        }

        // Fallback: resolve via the portal's credential/employee/list endpoint,
        // which works even when the open API is blocked from this host.
        if ($this->portal->isConfigured()) {
            $id = $this->portal->findPortalEmployeeIdByCode($pin);

            if ($id !== null && $id !== '') {
                Cache::put($cacheKey, $id, now()->addHour());

                return $id;
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
     * search endpoint. Consults the persisted DB column (cleared on
     * explicit delete) and the portal's credential list (covers legacy
     * enrollments that predate the persistence migration). Past biometric
     * punches are intentionally NOT checked — after an explicit delete, the
     * row history must not block re-enrollment.
     */
    private function guardViaAttendanceHistory(Employee $employee): void
    {
        if ($employee->fingerprint_enrolled_at !== null) {
            throw new RuntimeException(
                'You are already enrolled in the biometric terminal. Re-enrolling would create duplicate punches.'
            );
        }

        if (! $this->portal->isConfigured()) {
            return;
        }

        try {
            $credentials = $this->portal->findFingerprintCredentials((string) $employee->zkteco_pin);
        } catch (Throwable $e) {
            Log::info('Portal credential lookup failed during duplicate guard; allowing enrollment.', [
                'employee_id' => $employee->employee_id,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if ($credentials !== []) {
            $fingerIndex = null;

            foreach ($credentials as $credential) {
                if ($credential['signatureIndex'] !== null) {
                    $fingerIndex = $credential['signatureIndex'];
                    break;
                }
            }

            // Persist the legacy enrollment so future loads hit the fast path.
            $employee->forceFill([
                'fingerprint_enrolled_at' => now(),
                'fingerprint_finger_index' => $fingerIndex,
            ])->save();

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
