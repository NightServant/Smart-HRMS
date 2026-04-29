<?php

namespace App\Services\Biometric;

use App\Models\Employee;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Minimal WebAuthn (FIDO2) registration + authentication helper.
 *
 * The browser performs the actual biometric capture (Touch ID, Windows Hello,
 * Android fingerprint) through `navigator.credentials.create()` and
 * `navigator.credentials.get()`. The server never sees the fingerprint —
 * only the credential's public key, a server challenge, and a signed
 * assertion proving possession of the matching private key.
 */
class WebAuthnService
{
    private const CHALLENGE_TTL_SECONDS = 300;

    /**
     * Build the publicKey options for a registration ceremony.
     *
     * @return array<string, mixed>
     */
    public function generateRegistrationOptions(Employee $employee): array
    {
        $challenge = $this->generateChallenge();
        $userHandle = $this->resolveUserHandle($employee);

        $this->storeChallenge('register', $employee->employee_id, $challenge);

        return [
            'challenge' => $this->base64UrlEncode($challenge),
            'rp' => [
                'name' => (string) config('app.name', 'Smart HRMS'),
                'id' => $this->relyingPartyId(),
            ],
            'user' => [
                'id' => $this->base64UrlEncode($userHandle),
                'name' => (string) $employee->employee_id,
                'displayName' => (string) ($employee->name ?? $employee->employee_id),
            ],
            'pubKeyCredParams' => [
                ['type' => 'public-key', 'alg' => -7],   // ES256
                ['type' => 'public-key', 'alg' => -257], // RS256
            ],
            'authenticatorSelection' => [
                'authenticatorAttachment' => 'platform',
                'userVerification' => 'required',
                'residentKey' => 'preferred',
            ],
            'timeout' => 60000,
            'attestation' => 'none',
            'excludeCredentials' => $employee->webauthn_credential_id !== null
                ? [[
                    'type' => 'public-key',
                    'id' => $employee->webauthn_credential_id,
                ]]
                : [],
        ];
    }

    /**
     * Build the publicKey options for an authentication (clock-in) ceremony.
     *
     * @return array<string, mixed>
     */
    public function generateAuthenticationOptions(Employee $employee): array
    {
        if ($employee->webauthn_credential_id === null) {
            throw new RuntimeException('Employee has not enrolled a WebAuthn credential.');
        }

        $challenge = $this->generateChallenge();
        $this->storeChallenge('clock', $employee->employee_id, $challenge);

        return [
            'challenge' => $this->base64UrlEncode($challenge),
            'rpId' => $this->relyingPartyId(),
            'timeout' => 60000,
            'userVerification' => 'required',
            'allowCredentials' => [[
                'type' => 'public-key',
                'id' => $employee->webauthn_credential_id,
            ]],
        ];
    }

    /**
     * Verify a registration response from the browser and persist the
     * credential id + public key on the employee record.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyRegistration(Employee $employee, array $payload): void
    {
        $credentialId = (string) ($payload['id'] ?? '');
        $clientDataJSON = (string) ($payload['response']['clientDataJSON'] ?? '');
        $publicKeySpki = (string) ($payload['response']['publicKey'] ?? '');
        $publicKeyAlg = (int) ($payload['response']['publicKeyAlgorithm'] ?? 0);

        if ($credentialId === '' || $clientDataJSON === '' || $publicKeySpki === '') {
            throw new RuntimeException('Registration payload is incomplete.');
        }

        $clientData = $this->parseClientData($clientDataJSON);

        if (($clientData['type'] ?? null) !== 'webauthn.create') {
            throw new RuntimeException('Unexpected ceremony type for registration.');
        }

        $this->assertChallengeMatches('register', $employee->employee_id, (string) ($clientData['challenge'] ?? ''));
        $this->assertOriginAllowed((string) ($clientData['origin'] ?? ''));

        $userHandle = $this->resolveUserHandle($employee);

        $employee->forceFill([
            'webauthn_credential_id' => $credentialId,
            'webauthn_public_key' => $this->wrapAsPem($publicKeySpki, $publicKeyAlg),
            'webauthn_sign_count' => 0,
            'webauthn_user_handle' => $userHandle,
            'webauthn_enrolled_at' => now(),
        ])->save();

        $this->forgetChallenge('register', $employee->employee_id);
    }

    /**
     * Verify an authentication assertion from the browser. Returns true when
     * the signature is valid and the challenge / origin match what was issued.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyAuthentication(Employee $employee, array $payload): bool
    {
        $credentialId = (string) ($payload['id'] ?? '');
        $clientDataJSON = (string) ($payload['response']['clientDataJSON'] ?? '');
        $authenticatorData = (string) ($payload['response']['authenticatorData'] ?? '');
        $signature = (string) ($payload['response']['signature'] ?? '');

        if ($employee->webauthn_credential_id === null || $employee->webauthn_public_key === null) {
            return false;
        }

        if ($credentialId !== $employee->webauthn_credential_id) {
            return false;
        }

        if ($clientDataJSON === '' || $authenticatorData === '' || $signature === '') {
            return false;
        }

        $clientData = $this->parseClientData($clientDataJSON);

        if (($clientData['type'] ?? null) !== 'webauthn.get') {
            return false;
        }

        $this->assertChallengeMatches('clock', $employee->employee_id, (string) ($clientData['challenge'] ?? ''));
        $this->assertOriginAllowed((string) ($clientData['origin'] ?? ''));

        $authData = $this->base64UrlDecode($authenticatorData);
        $clientDataBytes = $this->base64UrlDecode($clientDataJSON);
        $signatureBytes = $this->base64UrlDecode($signature);

        $signedData = $authData.hash('sha256', $clientDataBytes, true);

        $publicKey = openssl_pkey_get_public($employee->webauthn_public_key);
        if ($publicKey === false) {
            throw new RuntimeException('Stored WebAuthn public key is invalid.');
        }

        $result = openssl_verify($signedData, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256);

        if ($result !== 1) {
            return false;
        }

        // The 4 bytes at offset 33 of authData encode the authenticator sign
        // count. Persist the latest value so we can detect cloning later.
        $signCount = strlen($authData) >= 37
            ? unpack('N', substr($authData, 33, 4))[1] ?? 0
            : 0;

        $employee->forceFill([
            'webauthn_sign_count' => max((int) $signCount, (int) $employee->webauthn_sign_count),
        ])->save();

        $this->forgetChallenge('clock', $employee->employee_id);

        return true;
    }

    /**
     * Convenience snapshot for the frontend.
     *
     * @return array<string, mixed>
     */
    public function status(Employee $employee): array
    {
        return [
            'enrolled' => $employee->webauthn_credential_id !== null,
            'enrolled_at' => $employee->webauthn_enrolled_at?->toIso8601String(),
            'rp_id' => $this->relyingPartyId(),
        ];
    }

    /**
     * Forget a credential so the employee can re-enroll on a new device.
     */
    public function resetEnrollment(Employee $employee): void
    {
        $employee->forceFill([
            'webauthn_credential_id' => null,
            'webauthn_public_key' => null,
            'webauthn_sign_count' => 0,
            'webauthn_user_handle' => null,
            'webauthn_enrolled_at' => null,
        ])->save();
    }

    private function generateChallenge(): string
    {
        return random_bytes(32);
    }

    private function resolveUserHandle(Employee $employee): string
    {
        $existing = $employee->webauthn_user_handle;
        if (is_string($existing) && strlen($existing) === 16) {
            return $existing;
        }

        return random_bytes(16);
    }

    private function storeChallenge(string $action, string $employeeId, string $challenge): void
    {
        Cache::put(
            $this->challengeKey($action, $employeeId),
            $this->base64UrlEncode($challenge),
            self::CHALLENGE_TTL_SECONDS,
        );
    }

    private function assertChallengeMatches(string $action, string $employeeId, string $clientChallenge): void
    {
        $expected = Cache::get($this->challengeKey($action, $employeeId));

        if (! is_string($expected) || ! hash_equals($expected, $clientChallenge)) {
            throw new RuntimeException('WebAuthn challenge did not match.');
        }
    }

    private function forgetChallenge(string $action, string $employeeId): void
    {
        Cache::forget($this->challengeKey($action, $employeeId));
    }

    private function challengeKey(string $action, string $employeeId): string
    {
        return "webauthn:challenge:{$action}:{$employeeId}";
    }

    /**
     * @return array<string, mixed>
     */
    private function parseClientData(string $clientDataJSON): array
    {
        $decoded = json_decode($this->base64UrlDecode($clientDataJSON), true);

        if (! is_array($decoded)) {
            throw new RuntimeException('clientDataJSON is not valid JSON.');
        }

        return $decoded;
    }

    private function assertOriginAllowed(string $origin): void
    {
        $allowed = $this->allowedOrigins();

        if (! in_array($origin, $allowed, true)) {
            throw new RuntimeException("WebAuthn origin {$origin} is not allowed.");
        }
    }

    /**
     * @return array<int, string>
     */
    private function allowedOrigins(): array
    {
        $configured = config('services.webauthn.origins');
        if (is_array($configured) && $configured !== []) {
            return array_values(array_map('strval', $configured));
        }

        $appUrl = (string) config('app.url', 'https://smart-hrms.test');

        return [rtrim($appUrl, '/')];
    }

    private function relyingPartyId(): string
    {
        $configured = config('services.webauthn.rp_id');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $host = parse_url((string) config('app.url', 'https://smart-hrms.test'), PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'smart-hrms.test';
    }

    private function wrapAsPem(string $base64Spki, int $algorithm): string
    {
        $body = chunk_split($base64Spki, 64, "\n");

        return "-----BEGIN PUBLIC KEY-----\n".$body."-----END PUBLIC KEY-----\n";
    }

    private function base64UrlEncode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $encoded): string
    {
        $padded = strtr($encoded, '-_', '+/');
        $padding = strlen($padded) % 4;
        if ($padding > 0) {
            $padded .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($padded, true);
        if ($decoded === false) {
            throw new RuntimeException('Failed to decode base64url string.');
        }

        return $decoded;
    }
}
