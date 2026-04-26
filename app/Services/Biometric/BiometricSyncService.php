<?php

namespace App\Services\Biometric;

use App\Models\BiometricDevice;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class BiometricSyncService
{
    private const LOCK_KEY = 'biometric:sync';

    private const LOCK_SECONDS = 60;

    public function __construct(
        private readonly ZkBioTimeClient $client,
        private readonly AttendanceProcessor $processor,
    ) {}

    public function sync(?string $deviceSerial = null, ?string $sinceOverride = null): SyncResult
    {
        $lock = Cache::lock(self::LOCK_KEY, self::LOCK_SECONDS);

        if (! $lock->get()) {
            return new SyncResult(skipped: true);
        }

        try {
            return $this->runSync($deviceSerial, $sinceOverride);
        } catch (LockTimeoutException $e) {
            return new SyncResult(skipped: true);
        } finally {
            $lock->release();
        }
    }

    private function runSync(?string $deviceSerial, ?string $sinceOverride): SyncResult
    {
        $device = $this->resolveDevice($deviceSerial);
        $cursor = $sinceOverride ?? $device->last_sync_stamp;

        $batchSize = (int) config('services.zkbiotime.page_size', 200);
        $batch = [];
        $fetched = 0;
        $stored = 0;
        $issues = 0;
        $issueTypes = [];
        $maxPunchTime = null;

        try {
            foreach ($this->client->fetchTransactions($cursor) as $row) {
                $fetched++;
                $batch[] = [
                    'pin' => $row['emp_code'],
                    'datetime' => $row['punch_time'],
                    'source' => 'biometric',
                ];

                if ($row['punch_time'] !== '') {
                    if ($maxPunchTime === null || $row['punch_time'] > $maxPunchTime) {
                        $maxPunchTime = $row['punch_time'];
                    }
                }

                if (count($batch) >= $batchSize) {
                    $result = $this->processor->process($device, $batch);
                    $stored += $result['stored'];
                    $issues += $result['issues'];
                    $issueTypes = array_merge($issueTypes, $result['issue_types']);
                    $batch = [];
                }
            }

            if ($batch !== []) {
                $result = $this->processor->process($device, $batch);
                $stored += $result['stored'];
                $issues += $result['issues'];
                $issueTypes = array_merge($issueTypes, $result['issue_types']);
            }
        } catch (RequestException|ConnectionException $e) {
            Log::warning('BiometricSyncService: api_error', [
                'message' => $e->getMessage(),
                'device' => $device->serial_number,
            ]);

            $this->processor->recordIssue(
                $device,
                pin: null,
                rawDateTime: null,
                issueType: 'api_error',
                message: 'ZKBio Time API request failed: '.$e->getMessage(),
            );

            return new SyncResult(
                recordsFetched: $fetched,
                recordsStored: $stored,
                issues: $issues + 1,
                cursor: $device->last_sync_stamp,
                deviceSerial: $device->serial_number,
                issueTypes: array_values(array_unique([...$issueTypes, 'api_error'])),
            );
        } catch (Throwable $e) {
            Log::error('BiometricSyncService: unexpected_error', [
                'message' => $e->getMessage(),
                'device' => $device->serial_number,
            ]);

            $this->processor->recordIssue(
                $device,
                pin: null,
                rawDateTime: null,
                issueType: 'api_error',
                message: 'Unexpected sync failure: '.$e->getMessage(),
            );

            return new SyncResult(
                recordsFetched: $fetched,
                recordsStored: $stored,
                issues: $issues + 1,
                cursor: $device->last_sync_stamp,
                deviceSerial: $device->serial_number,
                issueTypes: array_values(array_unique([...$issueTypes, 'api_error'])),
            );
        }

        if ($maxPunchTime !== null) {
            $newCursor = Carbon::parse($maxPunchTime)
                ->subSeconds(5)
                ->format('Y-m-d H:i:s');
            $device->forceFill([
                'last_sync_stamp' => $newCursor,
                'last_activity_at' => now(),
            ])->save();
        }

        return new SyncResult(
            recordsFetched: $fetched,
            recordsStored: $stored,
            issues: $issues,
            cursor: $device->last_sync_stamp,
            deviceSerial: $device->serial_number,
            issueTypes: array_values(array_unique($issueTypes)),
        );
    }

    private function resolveDevice(?string $serial): BiometricDevice
    {
        $query = BiometricDevice::query();

        if ($serial !== null && $serial !== '') {
            return $query->where('serial_number', $serial)->firstOrFail();
        }

        $configuredSerial = (string) config('services.zkbiotime.default_terminal_sn', '');

        if ($configuredSerial !== '') {
            return BiometricDevice::query()->firstOrCreate(
                ['serial_number' => $configuredSerial],
                ['name' => 'ZKBio Time Default Terminal', 'is_active' => true],
            );
        }

        $existing = $query->where('is_active', true)->orderBy('id')->first();

        if ($existing) {
            return $existing;
        }

        return BiometricDevice::query()->create([
            'serial_number' => 'ZKBIOTIME-DEFAULT',
            'name' => 'ZKBio Time Default Terminal',
            'is_active' => true,
        ]);
    }
}
