<?php

use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\Employee;
use Illuminate\Support\Facades\Cache;

const TEST_APP_KEY = '5bbnGhSltKLECfNg';            // 16 bytes (AES-128)
const TEST_ENCRYPT_KEY = 'TestIVBytes_____';        // 16 bytes
const TEST_SIGNATURE_TOKEN = 'sigtoken123';

beforeEach(function () {
    Cache::flush();

    config([
        'services.zlink.app_key' => TEST_APP_KEY,
        'services.zlink.encryption_key' => TEST_ENCRYPT_KEY,
        'services.zlink.signature_token' => TEST_SIGNATURE_TOKEN,
        'attendance.shift_start' => '08:00',
        'attendance.grace_period_minutes' => 0,
        'attendance.time_out_min_gap_minutes' => 60,
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-WH-1',
        'name' => 'Webhook Tester',
        'job_title' => 'Clerk',
        'zkteco_pin' => 'WH001',
    ]);
});

function pad16(string $plain): string
{
    $padLen = 16 - (strlen($plain) % 16);

    return $plain.str_repeat(chr($padLen), $padLen);
}

function aesEncrypt(string $plain): string
{
    $cipher = openssl_encrypt(
        pad16($plain),
        'aes-128-cbc',
        TEST_APP_KEY,
        OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING,
        TEST_ENCRYPT_KEY,
    );

    return bin2hex($cipher);
}

function makeSignature(string $timestamp, string $nonce): string
{
    return md5(TEST_SIGNATURE_TOKEN.$timestamp.$nonce);
}

test('webhook ingests punches and aggregates daily attendance', function () {
    $timestamp = (string) (int) round(microtime(true) * 1000);
    $nonce = 'abc12345';
    $sign = makeSignature($timestamp, $nonce);

    $encrypt = aesEncrypt(json_encode([
        'companyId' => 'co-1',
        'deviceId' => 'dev-1',
        'attLogs' => [[
            'attState' => '0',
            'deviceAlias' => 'nface',
            'sn' => 'PWA1243400011',
            'punchTime' => '2026-04-27T07:30:00+08:00',
            'operator' => 'WH001',
            'verifyType' => '4',
        ], [
            'attState' => '1',
            'deviceAlias' => 'nface',
            'sn' => 'PWA1243400011',
            'punchTime' => '2026-04-27T17:30:00+08:00',
            'operator' => 'WH001',
            'verifyType' => '4',
        ]],
    ]));

    $response = $this->postJson(
        "/api/biometrics/webhook/zlink?sign={$sign}&timestamp={$timestamp}&nonce={$nonce}",
        [
            'requestId' => 'req-aaa',
            'eventCode' => 'open:att_transaction:push',
            'encryptData' => $encrypt,
        ],
    );

    $response->assertOk();
    $response->assertJsonPath('code', 'ZCOP0000');

    expect(AttendanceRecord::query()->where('employee_id', 'EMP-WH-1')->count())->toBe(2);

    $daily = DailyAttendance::query()->firstWhere(['employee_id' => 'EMP-WH-1', 'date' => '2026-04-27']);
    expect($daily)->not->toBeNull();
    expect($daily->status)->toBe('on_time');
    expect($daily->time_in)->toBe('07:30:00');
});

test('webhook rejects bad signature', function () {
    $timestamp = (string) (int) round(microtime(true) * 1000);
    $response = $this->postJson(
        "/api/biometrics/webhook/zlink?sign=BADSIG&timestamp={$timestamp}&nonce=abc12345",
        ['requestId' => 'req-bbb', 'eventCode' => 'open:att_transaction:push', 'encryptData' => 'deadbeef'],
    );

    $response->assertOk();
    $response->assertJsonPath('code', 'ZCOP1002');
});

test('webhook rejects stale timestamp', function () {
    $stale = (string) ((int) round(microtime(true) * 1000) - (10 * 60 * 1000));
    $nonce = 'abc12345';
    $sign = makeSignature($stale, $nonce);

    $response = $this->postJson(
        "/api/biometrics/webhook/zlink?sign={$sign}&timestamp={$stale}&nonce={$nonce}",
        ['requestId' => 'req-ccc', 'eventCode' => 'open:att_transaction:push', 'encryptData' => 'x'],
    );

    $response->assertJsonPath('code', 'ZCOP1001');
});

test('duplicate requestId is processed only once', function () {
    $timestamp = (string) (int) round(microtime(true) * 1000);
    $nonce = 'abc12345';
    $sign = makeSignature($timestamp, $nonce);
    $encrypt = aesEncrypt(json_encode([
        'attLogs' => [[
            'punchTime' => '2026-04-27T07:30:00+08:00',
            'operator' => 'WH001',
            'sn' => 'PWA1',
        ]],
    ]));

    $payload = [
        'requestId' => 'req-dup',
        'eventCode' => 'open:att_transaction:push',
        'encryptData' => $encrypt,
    ];
    $url = "/api/biometrics/webhook/zlink?sign={$sign}&timestamp={$timestamp}&nonce={$nonce}";

    $this->postJson($url, $payload)->assertOk();
    $this->postJson($url, $payload)->assertOk();

    expect(AttendanceRecord::query()->where('employee_id', 'EMP-WH-1')->count())->toBe(1);
});

test('verify endpoint returns decrypted echo', function () {
    $timestamp = (string) (int) round(microtime(true) * 1000);
    $nonce = 'echonon1';
    $sign = makeSignature($timestamp, $nonce);
    $echoCipher = aesEncrypt('hello-world');

    $response = $this->getJson(
        "/api/biometrics/webhook/zlink?sign={$sign}&timestamp={$timestamp}&nonce={$nonce}&echo={$echoCipher}",
    );

    $response->assertOk();
    $response->assertJsonPath('code', 'ZCOP0000');
    $response->assertJsonPath('data', 'hello-world');
});
