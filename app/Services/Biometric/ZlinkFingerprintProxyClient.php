<?php

namespace App\Services\Biometric;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for the Smart HRMS fingerprint proxy (a Cloudflare Worker).
 *
 * The proxy holds the Zlink portal credentials and exposes a small, clean API.
 * Smart HRMS authenticates with a single bearer key (ZLINK_PROXY_API_KEY) and
 * never sees the Zlink login, cookies, or portal token chain — those live in
 * the proxy.
 */
class ZlinkFingerprintProxyClient
{
    public function __construct(
        private readonly string $baseUrl = '',
        private readonly string $apiKey = '',
        private readonly int $requestTimeout = 10,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            baseUrl: rtrim((string) config('services.zlink.proxy_url', ''), '/'),
            apiKey: (string) config('services.zlink.proxy_api_key', ''),
            requestTimeout: (int) config('services.zlink.request_timeout', 10),
        );
    }

    public function isConfigured(): bool
    {
        return $this->baseUrl !== '' && $this->apiKey !== '';
    }

    /**
     * List the employee's fingerprint credentials.
     *
     * @return array<int, array{id: string, fingerIndex: ?int}>
     */
    public function listFingerprints(string $employeeCode): array
    {
        $payload = $this->request('GET', '/v1/employees/'.rawurlencode($employeeCode).'/fingerprints');
        $rows = (array) ($payload['fingerprints'] ?? []);

        return array_values(array_map(static function ($row): array {
            $row = (array) $row;

            return [
                'id' => (string) ($row['id'] ?? ''),
                'fingerIndex' => isset($row['fingerIndex']) && is_numeric($row['fingerIndex'])
                    ? (int) $row['fingerIndex']
                    : null,
            ];
        }, $rows));
    }

    /**
     * Trigger an on-device fingerprint enrollment. Returns the proxy's session
     * id (used to poll the result), or null if none was issued.
     */
    public function triggerEnrollment(string $employeeCode, ?int $fingerIndex = null): ?string
    {
        $body = ['employeeCode' => $employeeCode];

        if ($fingerIndex !== null) {
            $body['fingerIndex'] = $fingerIndex;
        }

        $payload = $this->request('POST', '/v1/fingerprints/enroll', $body);
        $sessionId = (string) ($payload['sessionId'] ?? '');

        return $sessionId !== '' ? $sessionId : null;
    }

    /**
     * Poll an enrollment session. Returns 'pending', 'success', or 'failed'
     * (the proxy already interprets the device-cloud result shape).
     */
    public function enrollmentResult(string $sessionId): string
    {
        $payload = $this->request('GET', '/v1/fingerprints/enroll/'.rawurlencode($sessionId));

        return (string) ($payload['status'] ?? 'pending');
    }

    /**
     * Delete all of the employee's fingerprint credentials. Returns the count
     * removed.
     */
    public function deleteFingerprints(string $employeeCode): int
    {
        $payload = $this->request('DELETE', '/v1/employees/'.rawurlencode($employeeCode).'/fingerprints');

        return (int) ($payload['deleted'] ?? 0);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $body = []): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Zlink fingerprint proxy is not configured. Set ZLINK_PROXY_URL and ZLINK_PROXY_API_KEY.');
        }

        $request = Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout($this->requestTimeout);

        $url = $this->baseUrl.$path;

        $response = match ($method) {
            'GET' => $request->get($url),
            'DELETE' => $request->delete($url),
            default => $request->asJson()->post($url, $body),
        };

        $response->throw();

        return (array) $response->json();
    }
}
