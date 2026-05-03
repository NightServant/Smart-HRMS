<?php

namespace App\Services\Biometric;

use App\Services\SecretRepository;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for the ZKBio Zlink Open Platform.
 *
 * - Auth: POST /open-apis/authen/v1/tenantToken/internal with appKey + appSecret
 * - Token cached for tokenTtlMinutes; refreshes on 401
 * - Subsequent calls send "Authorization: Bearer t-…"
 */
class ZlinkClient
{
    private const TOKEN_CACHE_KEY = 'zlink:tenant-token';

    public function __construct(
        private readonly string $baseUrl,
        private readonly string $appKey,
        private readonly string $appSecret,
        private readonly int $tokenTtlMinutes = 50,
        private readonly int $requestTimeout = 10,
        private readonly int $pageSize = 200,
    ) {}

    public static function fromConfig(): self
    {
        $url = (string) config('services.zlink.url');

        if ($url === '') {
            throw new RuntimeException('ZLINK_URL is not configured.');
        }

        // Secrets are read from encrypted DB storage when present, with
        // env fallback for first-run / CI. See app/Services/SecretRepository.
        $secrets = app(SecretRepository::class);
        $appKey = $secrets->get('zlink.app_key', 'services.zlink.app_key') ?? '';
        $appSecret = $secrets->get('zlink.app_secret', 'services.zlink.app_secret') ?? '';

        if ($appKey === '' || $appSecret === '') {
            throw new RuntimeException('Zlink open-API credentials are not configured. Run `php artisan zlink:secrets:migrate` or set ZLINK_APP_KEY and ZLINK_APP_SECRET.');
        }

        return new self(
            baseUrl: rtrim($url, '/'),
            appKey: $appKey,
            appSecret: $appSecret,
            tokenTtlMinutes: (int) config('services.zlink.token_ttl_minutes', 50),
            requestTimeout: (int) config('services.zlink.request_timeout', 10),
            pageSize: (int) config('services.zlink.page_size', 200),
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
            ->withHeaders(['Accept-Language' => 'en-US'])
            ->post("{$this->baseUrl}/open-apis/authen/v1/tenantToken/internal", [
                'appKey' => $this->appKey,
                'appSecret' => $this->appSecret,
            ]);

        $response->throw();

        $payload = (array) $response->json();
        $code = (string) ($payload['code'] ?? '');

        if ($code !== 'ZCOP0000') {
            throw new RuntimeException(sprintf(
                'Zlink auth failed: %s (%s)',
                $payload['message'] ?? 'unknown error',
                $code,
            ));
        }

        $token = (string) (($payload['data'] ?? [])['tenantToken'] ?? '');

        if ($token === '') {
            throw new RuntimeException('Zlink auth response did not contain a tenantToken.');
        }

        Cache::put(self::TOKEN_CACHE_KEY, $token, now()->addMinutes($this->tokenTtlMinutes));

        return $token;
    }

    /**
     * Create an employee in Zlink. Returns the platform's response payload.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createEmployee(array $payload): array
    {
        return $this->postJson('/open-apis/org/v1/employees', $payload);
    }

    /**
     * Update an existing employee in Zlink (matched by employeeCode).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function updateEmployee(array $payload): array
    {
        return $this->postJson('/open-apis/org/v1/employees/update', $payload);
    }

    /**
     * Create a department in Zlink. Returns the new departmentId.
     */
    public function createDepartment(string $name, ?string $parentId = null): string
    {
        $body = ['name' => $name];

        if ($parentId !== null && $parentId !== '') {
            $body['parentDeptId'] = $parentId;
        }

        $payload = $this->postJson('/open-apis/org/v1/departments', $body);
        $data = (array) ($payload['data'] ?? []);

        $id = (string) ($data['departmentId'] ?? $data['id'] ?? '');

        if ($id === '') {
            throw new RuntimeException('Zlink createDepartment did not return a departmentId.');
        }

        return $id;
    }

    /**
     * Rename / update a department in Zlink by its departmentId.
     *
     * @return array<string, mixed>
     */
    public function updateDepartment(string $departmentId, string $name): array
    {
        return $this->postJson('/open-apis/org/v1/departments/update', [
            'departmentId' => $departmentId,
            'name' => $name,
        ]);
    }

    /**
     * Look up an existing department by exact name. Returns the departmentId
     * or null if not found. Used to avoid creating duplicates.
     */
    public function findDepartmentByName(string $name): ?string
    {
        $needle = trim(mb_strtolower($name));

        if ($needle === '') {
            return null;
        }

        foreach ($this->listDepartments() as $row) {
            $rowName = trim(mb_strtolower((string) ($row['name'] ?? '')));

            if ($rowName === $needle) {
                $id = (string) ($row['id'] ?? $row['departmentId'] ?? '');

                if ($id !== '') {
                    return $id;
                }
            }
        }

        return null;
    }

    /**
     * Push the given employee codes to a specific biometric terminal so that
     * users can enroll their fingerprint at that terminal.
     *
     * @param  array<int, string>  $employeeCodes
     * @return array<string, mixed>
     */
    public function pushEmployeesToDevice(string $deviceSn, array $employeeCodes): array
    {
        return $this->postJson('/open-apis/devices/v1/devices/employees/sync', [
            'sn' => $deviceSn,
            'employeeCodes' => array_values($employeeCodes),
        ]);
    }

    /**
     * Trigger a remote fingerprint enrollment session on the given device for
     * a single employee. The device will prompt the user to place their
     * finger; the captured template is pushed back to Zlink.
     *
     * @return array<string, mixed>
     */
    public function triggerRemoteFingerprintEnrollment(string $deviceSn, string $employeeCode, int $fingerIndex = 1): array
    {
        return $this->postJson('/open-apis/biometric/v1/remote-enroll', [
            'sn' => $deviceSn,
            'employeeCode' => $employeeCode,
            'biometricType' => 'fingerprint',
            'fingerIndex' => $fingerIndex,
        ]);
    }

    /**
     * List enrolled fingerprint templates for an employee.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listEmployeeFingerprints(string $employeeCode): array
    {
        $payload = $this->postJson('/open-apis/biometric/v1/fingerprints/search', [
            'employeeCode' => $employeeCode,
            'pageNumber' => 1,
            'pageSize' => 20,
        ]);

        $data = (array) ($payload['data'] ?? []);
        $items = $data['fingerprints'] ?? $data['list'] ?? [];

        if (! is_array($items)) {
            return [];
        }

        return array_values(array_map(static fn ($row): array => (array) $row, $items));
    }

    /**
     * Pull attendance transaction records from the Zlink open API for the given
     * time window. The att subsystem accepts `startDateTime` / `endDateTime` in
     * `Y-m-d H:i:s` format (local time). Returns a flat list of transaction
     * rows — each row includes at minimum `employeeCode`, `checkTime`, and
     * `areaName`.
     *
     * Field names confirmed via direct probing on 2026-05-03: only
     * `startDateTime`/`endDateTime` satisfy the validator. The error codes
     * ZCOP1020/ZCOP1021 ("Access record start/end time is required") are
     * reported non-deterministically when the names don't match — they are
     * not reliable for guessing the correct names.
     *
     * Note: this endpoint requires the `att/v1` permission to be granted to
     * the open-API app key in the Zlink developer portal. Without it, calls
     * return ZKBC0004 ("No permission, please authorize and then use this
     * feature").
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAttendanceTransactions(Carbon $since, Carbon $until): array
    {
        return $this->paginatedSearch(
            path: '/open-apis/att/v1/transactions/search',
            listKey: 'list',
            extra: [
                'startDateTime' => $since->format('Y-m-d H:i:s'),
                'endDateTime' => $until->format('Y-m-d H:i:s'),
            ],
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listDepartments(): array
    {
        return $this->paginatedSearch(
            path: '/open-apis/org/v1/departments/search',
            listKey: 'depts',
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listEmployees(?string $employeeCode = null): array
    {
        $extra = [];

        if ($employeeCode !== null && $employeeCode !== '') {
            $extra['code'] = $employeeCode;
        }

        return $this->paginatedSearch(
            path: '/open-apis/org/v1/employees/search',
            listKey: 'employee',
            extra: $extra,
        );
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<int, array<string, mixed>>
     */
    private function paginatedSearch(string $path, string $listKey, array $extra = []): array
    {
        $rows = [];
        $pageNumber = 1;
        // Zlink page size max is 100 per docs.
        $pageSize = min($this->pageSize, 100);

        while (true) {
            $payload = $this->postJson($path, array_merge($extra, [
                'pageNumber' => $pageNumber,
                'pageSize' => $pageSize,
            ]));

            $data = (array) ($payload['data'] ?? []);
            $items = $data[$listKey] ?? [];

            if (! is_array($items) || $items === []) {
                break;
            }

            foreach ($items as $item) {
                $rows[] = (array) $item;
            }

            $totalPages = (int) ($data['totalPages'] ?? 1);

            if ($pageNumber >= $totalPages) {
                break;
            }

            $pageNumber++;
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function postJson(string $path, array $body): array
    {
        $url = "{$this->baseUrl}{$path}";

        $response = $this->authedRequest()->post($url, $body);

        if ($response->status() === 401) {
            $this->authenticate(forceRefresh: true);
            $response = $this->authedRequest()->post($url, $body);
        }

        $response->throw();

        $payload = (array) $response->json();
        $this->guardErrorCode($payload);

        return $payload;
    }

    private function authedRequest(): PendingRequest
    {
        $token = $this->authenticate();

        return Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Accept-Language' => 'en-US',
        ])
            ->acceptJson()
            ->asJson()
            ->timeout($this->requestTimeout)
            ->retry(3, 250, fn ($exception) => $exception instanceof ConnectionException, throw: false);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function guardErrorCode(array $payload): void
    {
        $code = (string) ($payload['code'] ?? '');

        // ZCOP0000 = success. Some endpoints may use ZCHC0000. Treat both as success.
        if ($code === '' || $code === 'ZCOP0000' || $code === 'ZCHC0000') {
            return;
        }

        throw new RuntimeException(sprintf(
            'Zlink API error %s: %s',
            $code,
            $payload['message'] ?? 'unknown',
        ));
    }
}
