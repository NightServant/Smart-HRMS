<?php

namespace App\Services\Biometric;

use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ZkBioTimeClient
{
    private const TOKEN_CACHE_KEY = 'zkbiotime:token';

    public function __construct(
        private readonly string $baseUrl,
        private readonly string $username,
        private readonly string $password,
        private readonly string $authMode = 'jwt',
        private readonly int $tokenTtlMinutes = 50,
        private readonly int $requestTimeout = 10,
        private readonly int $pageSize = 200,
    ) {}

    public static function fromConfig(): self
    {
        $url = (string) config('services.zkbiotime.url');

        if ($url === '') {
            throw new RuntimeException('ZKBIOTIME_URL is not configured.');
        }

        return new self(
            baseUrl: rtrim($url, '/'),
            username: (string) config('services.zkbiotime.username'),
            password: (string) config('services.zkbiotime.password'),
            authMode: (string) config('services.zkbiotime.auth_mode', 'jwt'),
            tokenTtlMinutes: (int) config('services.zkbiotime.token_ttl_minutes', 50),
            requestTimeout: (int) config('services.zkbiotime.request_timeout', 10),
            pageSize: (int) config('services.zkbiotime.page_size', 200),
        );
    }

    public function authenticate(bool $forceRefresh = false): string
    {
        if (! $forceRefresh) {
            $cached = Cache::get(self::TOKEN_CACHE_KEY);

            if (is_string($cached) && $cached !== '') {
                return $cached;
            }
        }

        $response = Http::acceptJson()
            ->timeout($this->requestTimeout)
            ->post("{$this->baseUrl}/jwt-api-token-auth/", [
                'username' => $this->username,
                'password' => $this->password,
            ]);

        $response->throw();

        $token = (string) ($response->json('token') ?? '');

        if ($token === '') {
            throw new RuntimeException('ZKBio Time auth response did not contain a token.');
        }

        Cache::put(self::TOKEN_CACHE_KEY, $token, now()->addMinutes($this->tokenTtlMinutes));

        return $token;
    }

    /**
     * Yields normalized transactions across all pages newer than $startTime.
     *
     * @return Generator<int, array{emp_code: string, punch_time: string, terminal_sn: ?string, punch_state: ?string}>
     */
    public function fetchTransactions(?string $startTime = null): Generator
    {
        $page = 1;

        while (true) {
            $params = [
                'page' => $page,
                'page_size' => $this->pageSize,
            ];

            if ($startTime !== null && $startTime !== '') {
                $params['start_time'] = $startTime;
            }

            $payload = $this->getJson('/iclock/api/transactions/', $params);
            $rows = $payload['data'] ?? [];

            if (! is_array($rows) || $rows === []) {
                return;
            }

            foreach ($rows as $row) {
                yield $this->normalizeTransaction((array) $row);
            }

            if (empty($payload['next'])) {
                return;
            }

            $page++;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createEmployee(array $payload): array
    {
        $response = $this->authedRequest()->post(
            "{$this->baseUrl}/personnel/api/employees/",
            $payload,
        );

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->post(
                "{$this->baseUrl}/personnel/api/employees/",
                $payload,
            );
        }

        $response->throw();

        return (array) $response->json();
    }

    public function assignEmployeeToTerminal(string $empCode, string $terminalSn): void
    {
        $response = $this->authedRequest()->post(
            "{$this->baseUrl}/personnel/api/transfer/",
            [
                'emp_code' => $empCode,
                'terminal_sn' => $terminalSn,
            ],
        );

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->post(
                "{$this->baseUrl}/personnel/api/transfer/",
                [
                    'emp_code' => $empCode,
                    'terminal_sn' => $terminalSn,
                ],
            );
        }

        $response->throw();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listTerminals(): array
    {
        $payload = $this->getJson('/iclock/api/terminals/', []);
        $rows = $payload['data'] ?? [];

        return is_array($rows) ? array_values($rows) : [];
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function getJson(string $path, array $params): array
    {
        $response = $this->authedRequest()->get("{$this->baseUrl}{$path}", $params);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->get("{$this->baseUrl}{$path}", $params);
        }

        $response->throw();

        return (array) $response->json();
    }

    private function authedRequest(): PendingRequest
    {
        $token = $this->authenticate();
        $authHeader = $this->authMode === 'token'
            ? "Token {$token}"
            : "JWT {$token}";

        return Http::withHeaders(['Authorization' => $authHeader])
            ->acceptJson()
            ->timeout($this->requestTimeout)
            ->retry(3, 250, fn ($exception) => $exception instanceof ConnectionException, throw: false);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{emp_code: string, punch_time: string, terminal_sn: ?string, punch_state: ?string}
     */
    private function normalizeTransaction(array $row): array
    {
        return [
            'emp_code' => trim((string) ($row['emp_code'] ?? $row['emp'] ?? '')),
            'punch_time' => trim((string) ($row['punch_time'] ?? '')),
            'terminal_sn' => isset($row['terminal_sn']) ? (string) $row['terminal_sn'] : null,
            'punch_state' => isset($row['punch_state']) ? (string) $row['punch_state'] : null,
        ];
    }
}
