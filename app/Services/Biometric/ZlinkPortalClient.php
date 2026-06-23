<?php

namespace App\Services\Biometric;

use App\Services\SecretRepository;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Client for the Zlink customer admin portal at zlink.minervaiot.com.
 *
 * The published open API at zlink-open.minervaiot.com does NOT expose a remote
 * fingerprint enrollment trigger on this tenant — every variant of
 * /open-apis/biometric/v1/remote-enroll returns 404. The portal API at
 * zlink.minervaiot.com/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration
 * does expose it, authenticated by an Owner/Admin login session.
 *
 * This client logs in with stored credentials, caches the access token, and
 * refreshes on 401. It is the pragmatic path until Zlink either publishes the
 * trigger in their open API or gates this endpoint differently.
 */
class ZlinkPortalClient
{
    private const TOKEN_CACHE_KEY = 'zlink:portal:access_token';

    private const REFRESH_CACHE_KEY = 'zlink:portal:refresh_token';

    private readonly string $baseUrl;

    private readonly string $username;

    private readonly string $password;

    private readonly int $tokenTtlMinutes;

    public function __construct(?SecretRepository $secrets = null)
    {
        $this->baseUrl = rtrim((string) config('services.zlink.portal_url'), '/');

        // Credentials live in encrypted DB storage by default; env is the
        // first-run / CI fallback. portal_url is a non-secret URL so it
        // stays in env.
        $secrets ??= app(SecretRepository::class);
        $this->username = $secrets->get('zlink.portal_username', 'services.zlink.portal_username') ?? '';
        $this->password = $secrets->get('zlink.portal_password', 'services.zlink.portal_password') ?? '';
        $this->tokenTtlMinutes = (int) config('services.zlink.portal_token_ttl_minutes', 55);

        if ($this->baseUrl === '') {
            throw new RuntimeException('ZLINK_PORTAL_URL is not configured.');
        }
    }

    public function isConfigured(): bool
    {
        return $this->username !== '' && $this->password !== '';
    }

    /**
     * Trigger an on-device remote registration session for the given employee.
     * The terminal will prompt the user to enroll their fingerprint.
     *
     * @return array<string, mixed> The portal response, including any tracking id.
     */
    public function triggerRemoteRegistration(
        string $deviceId,
        string $employeeId,
        string $pin,
        int $enrollType = 1,
        int $fid = 0,
    ): array {
        $payload = [
            'deviceId' => $deviceId,
            'employeeId' => $employeeId,
            'enrollType' => $enrollType,
            'fid' => $fid,
            'pin' => $pin,
        ];

        // DIAG: log exactly what we send. The portal `fid` parameter does not
        // appear to honor ZKTeco's 0–9 finger slot convention on this tenant —
        // sending fid:6 (Left Index) still results in slot 1 (Right Index)
        // being written. Logging both request and response so we can correlate
        // with what fingerprintVersionMap reports back. Remove once the param
        // contract is confirmed via portal DevTools capture.
        Log::info('zlink.portal.remoteRegistration.request', [
            'payload' => $payload,
        ]);

        $response = $this->postJson('/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration', $payload);

        Log::info('zlink.portal.remoteRegistration.response', [
            'sent_fid' => $fid,
            'response' => $response,
        ]);

        return $response;
    }

    /**
     * Poll the result of a previously-issued remote registration.
     *
     * @return array<string, mixed>
     */
    public function getRemoteRegistrationResult(string $registrationId): array
    {
        return $this->getJson(
            '/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration/result/'.$registrationId,
        );
    }

    /**
     * Delete fingerprint credentials by their portal credential ids (the
     * `id` field on each credential returned by findFingerprintCredentials /
     * findCredentialIdsByEmployeeCode). Mirrors the SPA's "Delete" button on
     * the biological-template page.
     *
     * The SPA hits a single batch endpoint:
     *   DELETE /zlink-api/v2.0/zlink/cms/credentials  body: {"ids": [...]}
     *
     * Captured from the SPA's network trace on 2026-05-03. The earlier
     * per-id v1.0 endpoint (`DELETE /v1.0/.../credential/{id}`) returns 200
     * but is a no-op: the credential remains visible on /org/biologicalTemplate.
     *
     * @param  array<int, string>  $credentialIds
     * @return array<string, mixed> the single batch response
     */
    public function deleteFingerprintCredentials(array $credentialIds): array
    {
        $ids = array_values($credentialIds);

        Log::info('zlink.portal.credential.delete.request', [
            'credential_ids' => $ids,
        ]);

        $response = $this->deleteJsonWithBody(
            '/zlink-api/v2.0/zlink/cms/credentials',
            ['ids' => $ids],
        );

        Log::info('zlink.portal.credential.delete.response', [
            'credential_ids' => $ids,
            'response' => $response,
        ]);

        return $response;
    }

    /**
     * List the credential IDs Zlink has on file for the given employeeCode,
     * filtered by bioType (1=fingerprint, 2=face, 100=card, etc.). The SPA
     * uses this exact endpoint to render the rows on /org/biologicalTemplate
     * — it's the only credential discovery path that actually returns the
     * `id` values needed for the v2.0 batch DELETE.
     *
     * The companion endpoint `cms/credential/fingerprint/devices` returns
     * `fingerprintVersionMap: null` for this tenant even when credentials
     * exist; this endpoint does not. Captured from the SPA on 2026-05-03.
     *
     * @return array<int, string>
     */
    /**
     * Look up the Zlink portal's internal employee UUID by employee code.
     * Uses the same cms/credential/employee/list endpoint as findCredentialIdsByEmployeeCode
     * because it works on tenants where the open API /employees/search returns 405.
     * Returns null when the employee is not found on the portal.
     */
    public function findPortalEmployeeIdByCode(string $employeeCode): ?string
    {
        if ($employeeCode === '') {
            return null;
        }

        try {
            $payload = $this->postJson('/zlink-api/v1.0/zlink/cms/credential/employee/list', [
                'pageNumber' => 1,
                'pageSize' => 10,
                'employeeCode' => $employeeCode,
                'current' => 1,
            ]);
        } catch (\Throwable) {
            return null;
        }

        $employees = (array) (((array) ($payload['data'] ?? []))['employees'] ?? []);

        foreach ($employees as $row) {
            if (! is_array($row)) {
                continue;
            }

            $code = (string) ($row['code'] ?? $row['employeeCode'] ?? '');
            $id = (string) ($row['id'] ?? '');

            if ($id !== '' && ($code === $employeeCode || $code === '')) {
                return $id;
            }
        }

        return null;
    }

    public function findCredentialIdsByEmployeeCode(string $employeeCode, int $bioType = 1): array
    {
        if ($employeeCode === '') {
            return [];
        }

        $payload = $this->postJson('/zlink-api/v1.0/zlink/cms/credential/employee/list', [
            'pageNumber' => 1,
            'pageSize' => 10,
            'employeeCode' => $employeeCode,
            'current' => 1,
        ]);

        $employees = (array) (((array) ($payload['data'] ?? []))['employees'] ?? []);
        $ids = [];

        foreach ($employees as $employee) {
            $credentials = (array) ((is_array($employee) ? $employee : [])['credentials'] ?? []);

            foreach ($credentials as $credential) {
                if (! is_array($credential)) {
                    continue;
                }

                $rowBioType = (int) ($credential['bioType'] ?? 0);
                $id = (string) ($credential['id'] ?? '');

                if ($rowBioType !== $bioType || $id === '') {
                    continue;
                }

                $ids[] = $id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * List the employee's fingerprint credentials with their finger slot. The
     * SPA's cms/credential/employee/list returns each credential inline with
     * `id`, `bioType`, and `signatureIndex` (the ZKTeco finger slot 0–9) — so a
     * single call yields both "is enrolled?" and "which finger?". This is the
     * reliable signal: the companion v2.0 fingerprint/devices endpoint returns
     * `fingerprintVersionMap: null` on this tenant even when credentials exist.
     *
     * @return array<int, array{id: string, signatureIndex: ?int}>
     */
    public function findFingerprintCredentials(string $employeeCode, int $bioType = 1): array
    {
        if ($employeeCode === '') {
            return [];
        }

        $payload = $this->postJson('/zlink-api/v1.0/zlink/cms/credential/employee/list', [
            'pageNumber' => 1,
            'pageSize' => 10,
            'employeeCode' => $employeeCode,
            'current' => 1,
        ]);

        $employees = (array) (((array) ($payload['data'] ?? []))['employees'] ?? []);
        $credentials = [];

        foreach ($employees as $employee) {
            $rows = (array) ((is_array($employee) ? $employee : [])['credentials'] ?? []);

            foreach ($rows as $credential) {
                if (! is_array($credential)) {
                    continue;
                }

                $rowBioType = (int) ($credential['bioType'] ?? 0);
                $id = (string) ($credential['id'] ?? '');

                if ($rowBioType !== $bioType || $id === '') {
                    continue;
                }

                $credentials[] = [
                    'id' => $id,
                    'signatureIndex' => isset($credential['signatureIndex']) && is_numeric($credential['signatureIndex'])
                        ? (int) $credential['signatureIndex']
                        : null,
                ];
            }
        }

        return $credentials;
    }

    /**
     * Create an employee on the Zlink portal. Mirrors the SPA's "Add Person"
     * form on /org/employee — the open API endpoint
     * (POST /open-apis/org/v1/employees) returns 405 on this tenant, so the
     * portal endpoint is the working path.
     *
     * Captured from the SPA on 2026-05-07. The portal expects the payload as
     * `application/x-www-form-urlencoded`, NOT JSON, and returns the new
     * employee's portal UUID under `data.id` with success code `OMSI0006`.
     *
     * @param  array<string, mixed>  $payload  see SPA form fields:
     *                                         employeeCode, firstName, lastName,
     *                                         departmentId, designationId,
     *                                         email, phone, gender, joinDate,
     *                                         tagIds, probationEnd
     * @return array<string, mixed> the parsed response, with `data.id` on success
     */
    public function createEmployee(array $payload): array
    {
        return $this->postMultipart('/zlink-api/v1.0/zlink/org/employee', $payload);
    }

    /**
     * Create a department on the Zlink portal. Mirrors the SPA's "Add
     * Department" dialog → POST /zlink-api/v2.0/zlink/org/dept/create with a
     * JSON body of {name, parentId, leadId}. The open-API equivalent
     * (POST /open-apis/org/v1/departments) returns 405 on this tenant.
     *
     * Captured from the SPA on 2026-05-07. Success code is OMSI0001 and the
     * new department's UUID is returned as `data.id`.
     */
    public function createDepartment(string $name, ?string $parentId = null, ?string $leadId = null): string
    {
        $resolvedParent = $parentId
            ?? (string) config('services.zlink.portal_root_department_id', '');

        if ($resolvedParent === '') {
            throw new RuntimeException(
                'ZLINK_PORTAL_ROOT_DEPARTMENT_ID is not configured; portal createDepartment requires a parentId.'
            );
        }

        $response = $this->postJson('/zlink-api/v2.0/zlink/org/dept/create', [
            'name' => $name,
            'parentId' => $resolvedParent,
            'leadId' => $leadId,
        ]);

        $id = (string) (((array) ($response['data'] ?? []))['id'] ?? '');

        if ($id === '') {
            throw new RuntimeException(sprintf(
                'Zlink portal createDepartment did not return data.id: %s (%s)',
                $response['message'] ?? 'unknown',
                $response['code'] ?? 'no code',
            ));
        }

        return $id;
    }

    /**
     * Rename / update an existing department on the Zlink portal.
     *
     * PUT /zlink-api/v2.0/zlink/org/dept/update/{id} with the same JSON shape
     * as create: {name, parentId, leadId}. Captured from the SPA on
     * 2026-05-07. The open-API equivalent (POST /open-apis/org/v1/departments/update)
     * returns 405 on this tenant.
     */
    public function updateDepartment(string $departmentId, string $name, ?string $parentId = null, ?string $leadId = null): array
    {
        $resolvedParent = $parentId
            ?? (string) config('services.zlink.portal_root_department_id', '');

        return $this->putJson('/zlink-api/v2.0/zlink/org/dept/update/'.$departmentId, [
            'name' => $name,
            'parentId' => $resolvedParent !== '' ? $resolvedParent : null,
            'leadId' => $leadId,
        ]);
    }

    /**
     * List Zlink portal departments via the SPA's tree endpoint. Each row
     * carries `id` (portal UUID) and `name`. Used to resolve a local
     * department to its `zlink_department_id` without hitting the open API
     * (which 405s on /open-apis/org/v1/departments/search for this tenant).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listDepartmentTreeNodes(): array
    {
        $payload = $this->getJson('/zlink-api/v1.0/zlink/org/department/treeNode');

        return $this->flattenTreeNodes((array) ($payload['data'] ?? []));
    }

    /**
     * @param  array<int|string, mixed>  $nodes
     * @return array<int, array<string, mixed>>
     */
    private function flattenTreeNodes(array $nodes): array
    {
        $rows = [];

        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }

            $rows[] = $node;

            $children = $node['children'] ?? [];

            if (is_array($children) && $children !== []) {
                foreach ($this->flattenTreeNodes($children) as $child) {
                    $rows[] = $child;
                }
            }
        }

        return $rows;
    }

    /**
     * Authenticate against the portal and cache the access + refresh tokens.
     *
     * The portal uses a two-step flow: a plain login returns a "company-less"
     * token, then switchCompany re-issues a token scoped to the chosen company.
     * Only the company-scoped token can call protected endpoints like
     * remoteRegistration.
     */
    public function authenticate(bool $forceRefresh = false): string
    {
        // Manual override for debugging: paste a Bearer token captured from the
        // browser DevTools to isolate "is auth wrong, or are headers wrong?".
        // When set, skip the login chain entirely.
        $override = (string) config('services.zlink.portal_bearer_override', '');

        if ($override !== '') {
            return $override;
        }

        if (! $this->isConfigured()) {
            throw new RuntimeException('Zlink portal credentials are not configured. Set ZLINK_PORTAL_USERNAME and ZLINK_PORTAL_PASSWORD.');
        }

        if (! $forceRefresh) {
            $cached = Cache::get(self::TOKEN_CACHE_KEY);

            if (is_string($cached) && $cached !== '') {
                return $cached;
            }
        }

        $loginToken = $this->performLogin();
        $companyId = $this->resolveCompanyId($loginToken);
        $companyToken = $this->switchCompany($loginToken, $companyId);

        Cache::put(self::TOKEN_CACHE_KEY, $companyToken, now()->addMinutes($this->tokenTtlMinutes));

        return $companyToken;
    }

    private function performLogin(): string
    {
        // Send SPA headers (Source: pc, Device-UniqueID, etc.) on the login
        // chain as well — the portal binds the issued token's privilege class
        // to the requesting client type, and a non-PC login produces a token
        // that gets 401 "This Token Unauthorized" on remoteRegistration.
        $response = Http::withHeaders($this->spaHeaders())
            ->asJson()
            ->acceptJson()
            ->timeout((int) config('services.zlink.request_timeout', 10))
            ->post($this->baseUrl.'/zlink-api/v1.0/zlink/customer/sso/login', [
                'userName' => $this->username,
                'password' => $this->password,
            ]);

        $response->throw();

        $payload = (array) $response->json();
        $data = (array) ($payload['data'] ?? []);
        $token = (string) ($data['access_token'] ?? '');
        $refresh = (string) ($data['refresh_token'] ?? '');

        if ($token === '') {
            throw new RuntimeException('Zlink portal login did not return an access_token. Response code: '.($payload['code'] ?? 'unknown'));
        }

        if ($refresh !== '') {
            Cache::put(self::REFRESH_CACHE_KEY, $refresh, now()->addDays(1));
        }

        return $token;
    }

    /**
     * Some Zlink portal endpoints (notably remoteRegistration) only honor the
     * session when the JWT is also presented as an `Authorization` cookie.
     * Bearer header alone returns ZKBC0004 "No permission". The refresh token
     * is mirrored as a cookie too because the SPA always sends both.
     *
     * @return array<string, string>
     */
    private function authCookies(string $accessToken): array
    {
        $cookies = ['Authorization' => $accessToken];

        $refresh = Cache::get(self::REFRESH_CACHE_KEY);

        if (is_string($refresh) && $refresh !== '') {
            $cookies['RefreshToken'] = $refresh;
        }

        return $cookies;
    }

    private function resolveCompanyId(string $loginToken): string
    {
        $configured = (string) config('services.zlink.portal_company_id', '');

        if ($configured !== '') {
            return $configured;
        }

        // Fall back to discovering it via the companies endpoint.
        $response = Http::withHeaders(array_merge(
            $this->spaHeaders(),
            ['Authorization' => 'Bearer '.$loginToken],
        ))
            ->acceptJson()
            ->timeout((int) config('services.zlink.request_timeout', 10))
            ->get($this->baseUrl.'/zlink-api/v1.0/zlink/customer/sso/user/companies');

        $response->throw();

        $payload = (array) $response->json();
        $list = (array) ($payload['data'] ?? []);

        // Response is typically an array of {id, name, ...}. Pick the first.
        $first = $list[0] ?? null;

        if (! is_array($first) || ! isset($first['id'])) {
            throw new RuntimeException('Zlink portal /companies returned no usable company. Set ZLINK_PORTAL_COMPANY_ID explicitly.');
        }

        return (string) $first['id'];
    }

    private function switchCompany(string $loginToken, string $companyId): string
    {
        $response = Http::withHeaders(array_merge(
            $this->spaHeaders(),
            ['Authorization' => 'Bearer '.$loginToken],
        ))
            ->asJson()
            ->acceptJson()
            ->timeout((int) config('services.zlink.request_timeout', 10))
            ->put($this->baseUrl.'/zlink-api/v1.0/zlink/customer/sso/user/switchCompany', [
                'companyId' => $companyId,
                'fromType' => 'PC',
            ]);

        $response->throw();

        $payload = (array) $response->json();
        $data = (array) ($payload['data'] ?? []);
        $token = (string) ($data['access_token'] ?? '');
        $refresh = (string) ($data['refresh_token'] ?? '');

        if ($token === '') {
            throw new RuntimeException('Zlink portal switchCompany did not return a company-scoped access_token. Response code: '.($payload['code'] ?? 'unknown'));
        }

        // The company-scoped refresh token (when issued) supersedes the one
        // captured at login. Both endpoints sometimes return new pairs.
        if ($refresh !== '') {
            Cache::put(self::REFRESH_CACHE_KEY, $refresh, now()->addDays(1));
        }

        return $token;
    }

    /**
     * POST as multipart/form-data. The portal's org/employee endpoint silently
     * drops most fields (firstName, lastName, employeeCode, email, joinDate)
     * when the request is application/x-www-form-urlencoded — the response
     * still says "creation successful" but the row is created with auto-
     * generated stub values. multipart is the only content-type the parser
     * accepts in full. Verified empirically against the live portal on
     * 2026-05-07; Chrome DevTools' "Form Data" tab makes both content-types
     * look identical, which is why the SPA capture was misleading.
     *
     * @param  array<string, mixed>  $fields  scalar values are stringified;
     *                                        nulls are sent as empty strings
     * @return array<string, mixed>
     */
    private function postMultipart(string $path, array $fields): array
    {
        $send = function () use ($path, $fields) {
            $req = $this->authedFormRequest();

            foreach ($fields as $name => $value) {
                $stringified = (string) ($value ?? '');

                // Guzzle's multipart builder rejects empty `contents`; skip
                // empty fields entirely. The portal endpoint tolerates this.
                if ($stringified === '') {
                    continue;
                }

                $req = $req->attach((string) $name, $stringified);
            }

            return $req->post($this->baseUrl.$path);
        };

        $response = $send();

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $send();
        }

        $response->throw();

        return (array) $response->json();
    }

    /**
     * Variant of authedRequest without `asJson()`/`asForm()` so the caller
     * can apply `attach()` for multipart uploads. The portal SPA submits the
     * "Add Person" form as multipart/form-data because the form includes a
     * file-upload field (Facial Photo); the parser then requires multipart
     * even when the file is omitted.
     */
    private function authedFormRequest(): PendingRequest
    {
        $token = $this->authenticate();

        return Http::withHeaders(array_merge(
            $this->spaHeaders(),
            ['Authorization' => 'Bearer '.$token],
        ))
            ->withCookies($this->authCookies($token), $this->cookieDomain())
            ->acceptJson()
            ->timeout((int) config('services.zlink.request_timeout', 10));
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function postJson(string $path, array $body): array
    {
        $response = $this->authedRequest()->post($this->baseUrl.$path, $body);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->post($this->baseUrl.$path, $body);
        }

        $response->throw();

        return (array) $response->json();
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function putJson(string $path, array $body): array
    {
        $response = $this->authedRequest()->put($this->baseUrl.$path, $body);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->put($this->baseUrl.$path, $body);
        }

        $response->throw();

        return (array) $response->json();
    }

    /**
     * @return array<string, mixed>
     */
    private function getJson(string $path): array
    {
        $response = $this->authedRequest()->get($this->baseUrl.$path);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->get($this->baseUrl.$path);
        }

        $response->throw();

        return (array) $response->json();
    }

    /**
     * @return array<string, mixed>
     */
    private function deleteJson(string $path): array
    {
        $response = $this->authedRequest()->delete($this->baseUrl.$path);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->delete($this->baseUrl.$path);
        }

        $response->throw();

        return (array) $response->json();
    }

    /**
     * Issue a DELETE request with a JSON body. The SPA's batch credential
     * delete (DELETE /v2.0/.../credentials) sends `{"ids": [...]}` as the
     * request body — Laravel's HTTP client supports this via the underlying
     * `send()` driver.
     *
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function deleteJsonWithBody(string $path, array $body): array
    {
        $send = fn () => $this->authedRequest()
            ->withBody(json_encode($body, JSON_THROW_ON_ERROR), 'application/json')
            ->delete($this->baseUrl.$path);

        $response = $send();

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $send();
        }

        $response->throw();

        return (array) $response->json();
    }

    private function authedRequest(): PendingRequest
    {
        $token = $this->authenticate();

        return Http::withHeaders(array_merge(
            $this->spaHeaders(),
            ['Authorization' => 'Bearer '.$token],
        ))
            ->withCookies($this->authCookies($token), $this->cookieDomain())
            ->asJson()
            ->acceptJson()
            ->timeout((int) config('services.zlink.request_timeout', 10));
    }

    /**
     * Headers the Zlink web SPA sends on every request. The portal cross-checks
     * several of these — without `Source: pc` the gateway issues a token that
     * later fails with 401 "This Token Unauthorized" on remoteRegistration.
     *
     * @return array<string, string>
     */
    private function spaHeaders(): array
    {
        $portalOrigin = $this->baseUrl;
        $deviceUniqueId = (string) config(
            'services.zlink.portal_device_unique_id',
            // Stable UUID per install so the portal sees a consistent device.
            // Generated once and pinned via env if you need to match a session.
            '00000000-0000-4000-8000-000000000001',
        );
        $timezone = (string) config('services.zlink.portal_timezone', 'Asia/Manila;dst=0;UTC=+08:00;');

        return [
            'Source' => 'pc',
            'Accept-Encoding' => 'identity',
            'Origin' => $portalOrigin,
            'Referer' => $portalOrigin.'/org/biologicalTemplate',
            'X-CSRF-Token' => 'TOKEN',
            'Device-UniqueID' => $deviceUniqueId,
            'Current-Timezone' => $timezone,
            'User-Agent' => 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
        ];
    }

    private function cookieDomain(): string
    {
        $host = parse_url($this->baseUrl, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'zlink.minervaiot.com';
    }
}
