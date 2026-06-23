<?php

use App\Services\Biometric\ZlinkFingerprintProxyClient;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.zlink.proxy_url' => 'https://proxy.test',
        'services.zlink.proxy_api_key' => 'proxy-key',
    ]);
});

function fpProxy(): ZlinkFingerprintProxyClient
{
    return ZlinkFingerprintProxyClient::fromConfig();
}

test('isConfigured reflects whether url and key are set', function () {
    expect(fpProxy()->isConfigured())->toBeTrue();

    config(['services.zlink.proxy_api_key' => '']);
    expect(ZlinkFingerprintProxyClient::fromConfig()->isConfigured())->toBeFalse();
});

test('listFingerprints calls the proxy with the bearer key and returns typed rows', function () {
    Http::fake([
        'https://proxy.test/v1/employees/EMP006/fingerprints' => Http::response([
            'fingerprints' => [['id' => 'cred-1', 'fingerIndex' => 0]],
        ], 200),
    ]);

    $rows = fpProxy()->listFingerprints('EMP006');

    expect($rows)->toBe([['id' => 'cred-1', 'fingerIndex' => 0]]);

    Http::assertSent(fn ($request) => $request->method() === 'GET'
        && str_ends_with($request->url(), '/v1/employees/EMP006/fingerprints')
        && $request->header('Authorization')[0] === 'Bearer proxy-key');
});

test('triggerEnrollment posts employeeCode and finger index and returns the sessionId', function () {
    Http::fake([
        'https://proxy.test/v1/fingerprints/enroll' => Http::response(['sessionId' => 'sess-1'], 200),
    ]);

    $sessionId = fpProxy()->triggerEnrollment('EMP006', 3);

    expect($sessionId)->toBe('sess-1');

    Http::assertSent(fn ($request) => $request->method() === 'POST'
        && str_ends_with($request->url(), '/v1/fingerprints/enroll')
        && ($request->data()['employeeCode'] ?? null) === 'EMP006'
        && ($request->data()['fingerIndex'] ?? null) === 3);
});

test('enrollmentResult returns the status string from the proxy', function () {
    Http::fake([
        'https://proxy.test/v1/fingerprints/enroll/sess-1' => Http::response(['status' => 'success', 'num' => '1'], 200),
    ]);

    expect(fpProxy()->enrollmentResult('sess-1'))->toBe('success');
});

test('deleteFingerprints returns the deleted count', function () {
    Http::fake([
        'https://proxy.test/v1/employees/EMP006/fingerprints' => Http::response(['deleted' => 2], 200),
    ]);

    expect(fpProxy()->deleteFingerprints('EMP006'))->toBe(2);

    Http::assertSent(fn ($request) => $request->method() === 'DELETE'
        && str_ends_with($request->url(), '/v1/employees/EMP006/fingerprints'));
});
