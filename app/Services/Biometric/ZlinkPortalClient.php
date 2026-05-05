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
     * `id` field on each cmsCredentialRespVos entry returned by
     * listEmployeeFingerprintDevices). Mirrors the SPA's "Delete" button on
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
     * List the devices that hold a fingerprint credential for the given
     * portal employee. Used as the third "is the user enrolled?" signal —
     * when the open-API fingerprints/search endpoint 404s (face-only Zlink
     * builds) and no biometric punch exists yet, this is the only way to
     * detect a successful enrollment that just happened on the terminal.
     *
     * The portal SPA's biological-template page calls this exact endpoint
     * with bioType=1 (fingerprint) and signatureNumber=5 (slot count to
     * return). A non-empty devices list = enrolled.
     *
     * @return array<string, mixed>
     */
    public function listEmployeeFingerprintDevices(
        string $portalEmployeeId,
        int $bioType = 1,
        int $signatureNumber = 5,
    ): array {
        return $this->postJson('/zlink-api/v2.0/zlink/cms/credential/fingerprint/devices', [
            'employeeId' => $portalEmployeeId,
            'bioType' => $bioType,
            'signatureNumber' => $signatureNumber,
        ]);
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
