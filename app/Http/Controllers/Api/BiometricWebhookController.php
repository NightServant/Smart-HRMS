<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricDevice;
use App\Services\Biometric\AttendanceProcessor;
use App\Services\Biometric\WebhookCrypto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Receives Zlink Open Platform event pushes.
 *
 * GET = URL-verification handshake (returns decrypted echo plaintext)
 * POST = real event push (e.g. open:att_transaction:push)
 *
 * Security model:
 * 1. Timestamp must be within 5 minutes of server time.
 * 2. sign = MD5(signatureToken + timestamp + nonce) must match.
 * 3. encryptData is AES-128-CBC ciphertext (hex), decrypted with key=AppKey, iv=encryptionKey.
 * 4. requestId is cached for 24h to prevent replay/duplicate processing.
 */
class BiometricWebhookController extends Controller
{
    private const REQUEST_DEDUP_TTL_SECONDS = 86400;

    public function __construct(
        private readonly WebhookCrypto $crypto,
        private readonly AttendanceProcessor $processor,
    ) {}

    public function verify(Request $request): JsonResponse
    {
        $sign = (string) $request->query('sign', '');
        $timestamp = (string) $request->query('timestamp', '');
        $nonce = (string) $request->query('nonce', '');
        $echo = (string) $request->query('echo', '');

        if (! $this->crypto->isTimestampFresh($timestamp)) {
            return $this->error('ZCOP1001', 'Timestamp expired or invalid.');
        }

        if (! $this->crypto->verifySignature($sign, $timestamp, $nonce)) {
            return $this->error('ZCOP1002', 'Signature mismatch.');
        }

        try {
            $plain = $this->crypto->decrypt($echo);
        } catch (Throwable $e) {
            Log::warning('BiometricWebhookController: decrypt failed', ['error' => $e->getMessage()]);

            return $this->error('ZCOP1003', 'Could not decrypt echo payload.');
        }

        return response()->json([
            'code' => 'ZCOP0000',
            'message' => 'Operation successful',
            'data' => $plain,
        ]);
    }

    public function receive(Request $request): JsonResponse
    {
        $sign = (string) $request->query('sign', '');
        $timestamp = (string) $request->query('timestamp', '');
        $nonce = (string) $request->query('nonce', '');

        if (! $this->crypto->isTimestampFresh($timestamp)) {
            return $this->error('ZCOP1001', 'Timestamp expired or invalid.');
        }

        if (! $this->crypto->verifySignature($sign, $timestamp, $nonce)) {
            return $this->error('ZCOP1002', 'Signature mismatch.');
        }

        $body = (array) $request->json()->all();
        $requestId = (string) ($body['requestId'] ?? '');
        $eventCode = (string) ($body['eventCode'] ?? '');

        if ($requestId === '') {
            return $this->error('ZCOP1004', 'requestId is required.');
        }

        $dedupKey = 'zlink:webhook:'.$requestId;
        $startedAt = microtime(true);

        Log::channel('biometric')->info('zlink.webhook.received', [
            'requestId' => $requestId,
            'eventCode' => $eventCode,
        ]);

        if (Cache::has($dedupKey)) {
            Log::channel('biometric')->info('zlink.webhook.duplicate', [
                'requestId' => $requestId,
                'eventCode' => $eventCode,
            ]);

            return response()->json([
                'code' => 'ZCOP0000',
                'message' => 'Already processed',
                'data' => null,
            ]);
        }

        try {
            $records = $this->extractAttLogs($body);
        } catch (Throwable $e) {
            Log::channel('biometric')->warning('zlink.webhook.parse_failed', [
                'requestId' => $requestId,
                'error' => $e->getMessage(),
            ]);

            return $this->error('ZCOP1005', 'Could not decrypt or parse encryptData.');
        }

        if ($eventCode === 'open:att_transaction:push' && $records !== []) {
            $device = $this->resolveDevice($body);
            $result = $this->processor->process($device, $records);

            Log::channel('biometric')->info('zlink.webhook.processed', [
                'requestId' => $requestId,
                'device_sn' => $device->serial_number,
                'received' => count($records),
                'stored' => $result['stored'],
                'issues' => $result['issues'],
                'issue_types' => $result['issue_types'],
                'pins' => array_values(array_unique(array_map(
                    static fn (array $r): string => (string) ($r['pin'] ?? ''),
                    $records,
                ))),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
        } else {
            Log::channel('biometric')->info('zlink.webhook.unhandled', [
                'requestId' => $requestId,
                'eventCode' => $eventCode,
                'records' => count($records),
            ]);
        }

        Cache::put($dedupKey, true, self::REQUEST_DEDUP_TTL_SECONDS);

        return response()->json([
            'code' => 'ZCOP0000',
            'message' => 'Operation successful',
            'data' => null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<int, array{pin: string, datetime: string, source: string}>
     */
    private function extractAttLogs(array $body): array
    {
        $encrypt = $body['encryptData'] ?? null;
        $data = is_string($encrypt)
            ? json_decode($this->crypto->decrypt($encrypt), true)
            : (is_array($encrypt) ? $encrypt : null);

        if (! is_array($data)) {
            return [];
        }

        $logs = $data['attLogs'] ?? [];

        if (! is_array($logs)) {
            return [];
        }

        $records = [];

        foreach ($logs as $log) {
            $row = (array) $log;
            $pin = trim((string) ($row['operator'] ?? ''));
            $time = trim((string) ($row['punchTime'] ?? ''));

            if ($pin === '' || $time === '') {
                continue;
            }

            $records[] = [
                'pin' => $pin,
                'datetime' => $time,
                'source' => 'biometric',
            ];
        }

        return $records;
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function resolveDevice(array $body): BiometricDevice
    {
        $encrypt = $body['encryptData'] ?? null;

        $data = is_string($encrypt)
            ? json_decode($this->crypto->decrypt($encrypt), true)
            : (is_array($encrypt) ? $encrypt : []);

        $sn = (string) ((($data['attLogs'][0] ?? [])['sn']) ?? ($data['deviceId'] ?? 'ZLINK-DEFAULT'));

        return BiometricDevice::query()->firstOrCreate(
            ['serial_number' => $sn],
            ['name' => 'Zlink Terminal '.$sn, 'is_active' => true],
        );
    }

    private function error(string $code, string $message): JsonResponse
    {
        return response()->json([
            'code' => $code,
            'message' => $message,
            'data' => null,
        ], 200);
    }
}
