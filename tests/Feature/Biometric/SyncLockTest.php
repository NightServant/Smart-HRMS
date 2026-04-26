<?php

use App\Services\Biometric\BiometricSyncService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    config([
        'services.zkbiotime.url' => 'https://zkbio.test',
        'services.zkbiotime.username' => 'admin',
        'services.zkbiotime.password' => 'admin',
        'services.zkbiotime.auth_mode' => 'jwt',
        'services.zkbiotime.default_terminal_sn' => 'TERM-A',
    ]);

    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'tok'], 200),
        'https://zkbio.test/iclock/api/transactions/*' => Http::response(['data' => [], 'next' => null], 200),
    ]);
});

test('concurrent sync calls only run once and the second is skipped', function () {
    $lock = Cache::lock('biometric:sync', 60);

    expect($lock->get())->toBeTrue();

    $result = app(BiometricSyncService::class)->sync();

    expect($result->skipped)->toBeTrue();

    $lock->release();

    $result = app(BiometricSyncService::class)->sync();

    expect($result->skipped)->toBeFalse();
});
