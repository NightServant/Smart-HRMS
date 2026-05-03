<?php

namespace App\Services\Biometric;

use App\Services\SecretRepository;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
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
        return $this->postJson('/zlink-api/v1.0/zlink/customer/dcc/device/remoteRegistration', [
            'deviceId' => $deviceId,
            'employeeId' => $employeeId,
            'enrollType' => $enrollType,
            'fid' => $fid,
            'pin' => $pin,
        ]);
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
