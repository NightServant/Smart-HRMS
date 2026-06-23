<?php

use App\Models\SystemSetting;
use App\Services\SecretRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

beforeEach(function () {
    Cache::flush();
});

test('reads encrypted value from system_settings and decrypts it', function () {
    SystemSetting::setEncrypted(
        key: 'test.api_key',
        plaintext: 'super-secret-value',
        userId: null,
        group: 'test',
        label: 'Test API Key',
    );

    $repo = new SecretRepository;

    expect($repo->get('test.api_key'))->toBe('super-secret-value');
});

test('falls back to config when system_settings has no row', function () {
    config(['services.test.api_key' => 'env-fallback-value']);

    $repo = new SecretRepository;

    expect($repo->get('test.api_key', 'services.test.api_key'))
        ->toBe('env-fallback-value');
});

test('prefers DB value over config fallback when both exist', function () {
    SystemSetting::setEncrypted('test.api_key', 'db-value', null, 'test', 'Test');
    config(['services.test.api_key' => 'env-value']);

    $repo = new SecretRepository;

    expect($repo->get('test.api_key', 'services.test.api_key'))->toBe('db-value');
});

test('returns null when neither DB nor config has a value', function () {
    config(['services.test.api_key' => null]);

    $repo = new SecretRepository;

    expect($repo->get('test.api_key', 'services.test.api_key'))->toBeNull();
});

test('require throws when secret is missing everywhere', function () {
    $repo = new SecretRepository;

    expect(fn () => $repo->require('missing.key', 'services.missing.path'))
        ->toThrow(RuntimeException::class, 'Required secret');
});

test('encrypted value is not stored in plaintext on disk', function () {
    SystemSetting::setEncrypted('test.api_key', 'plaintext-secret', null, 'test', 'Test');

    $row = SystemSetting::query()->where('key', 'test.api_key')->first();

    // The stored cell must not be the plaintext, and it must round-trip
    // through Crypt::decryptString() — a regression here would mean we
    // started storing plaintext by accident.
    expect($row->value)->not->toBe('plaintext-secret');
    expect($row->type)->toBe('encrypted');
    expect(Crypt::decryptString($row->value))->toBe('plaintext-secret');
});

test('zlink:secrets:migrate writes encrypted rows for every configured secret', function () {
    config([
        'services.zlink.app_key' => 'app-key-from-env',
        'services.zlink.app_secret' => 'app-secret-from-env',
        'services.zlink.signature_token' => 'sig-token',
        'services.zlink.encryption_key' => 'enc-key',
    ]);

    $this->artisan('zlink:secrets:migrate')->assertSuccessful();

    $repo = new SecretRepository;

    expect($repo->get('zlink.app_key'))->toBe('app-key-from-env');
    expect($repo->get('zlink.app_secret'))->toBe('app-secret-from-env');
    expect($repo->get('zlink.signature_token'))->toBe('sig-token');

    // Critical: the row must be encrypted at rest, not plaintext.
    $secretRow = SystemSetting::query()->where('key', 'zlink.app_secret')->first();
    expect($secretRow->value)->not->toBe('app-secret-from-env');
    expect($secretRow->type)->toBe('encrypted');
});
