<?php

namespace App\Services\Biometric;

use RuntimeException;

/**
 * Verifies Zlink webhook signatures and decrypts encryptData payloads.
 *
 * Per Zlink docs (https://zlink-help.minervaiot.com — "Step 3: Receive Events"):
 * - sign = MD5-32-lowercase(signatureToken + timestamp + nonce)
 * - timestamp window: 5 minutes
 * - encryptData: AES/CBC/NoPadding, key = AppKey (16 bytes), iv = encryptionKey (16 bytes)
 *   Cipher text is hex-encoded.
 */
class WebhookCrypto
{
    public const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

    public function __construct(
        private readonly string $signatureToken,
        private readonly string $appKey,
        private readonly string $encryptionKey,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            signatureToken: (string) config('services.zlink.signature_token'),
            appKey: (string) config('services.zlink.app_key'),
            encryptionKey: (string) config('services.zlink.encryption_key'),
        );
    }

    public function verifySignature(string $sign, string $timestamp, string $nonce): bool
    {
        if ($this->signatureToken === '') {
            return false;
        }

        $expected = md5($this->signatureToken.$timestamp.$nonce);

        return hash_equals($expected, strtolower(trim($sign)));
    }

    public function isTimestampFresh(string $timestamp, ?int $nowMs = null): bool
    {
        if (! ctype_digit($timestamp)) {
            return false;
        }

        $now = $nowMs ?? (int) round(microtime(true) * 1000);
        $diff = abs($now - (int) $timestamp);

        return $diff <= self::TIMESTAMP_WINDOW_MS;
    }

    public function decrypt(string $hexCipherText): string
    {
        if ($this->appKey === '' || $this->encryptionKey === '') {
            throw new RuntimeException('ZLINK_APP_KEY and ZLINK_ENCRYPTION_KEY must be configured before decrypting webhook payloads.');
        }

        $cipher = @hex2bin($hexCipherText);

        if ($cipher === false || $cipher === '') {
            throw new RuntimeException('Webhook payload is not a valid hex string.');
        }

        $plain = openssl_decrypt(
            $cipher,
            'aes-128-cbc',
            $this->appKey,
            OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING,
            $this->encryptionKey,
        );

        if ($plain === false) {
            throw new RuntimeException('Failed to AES-decrypt webhook payload.');
        }

        return $this->stripPadding($plain);
    }

    /**
     * Strip PKCS#7 / zero padding that may be present in NoPadding-mode ciphertext.
     */
    private function stripPadding(string $plain): string
    {
        $length = strlen($plain);

        if ($length === 0) {
            return $plain;
        }

        $lastByte = ord($plain[$length - 1]);

        // PKCS#7: last byte indicates pad length (1-16) and that many trailing bytes match.
        if ($lastByte > 0 && $lastByte <= 16) {
            $padding = substr($plain, -$lastByte);

            if ($padding === str_repeat(chr($lastByte), $lastByte)) {
                return substr($plain, 0, $length - $lastByte);
            }
        }

        // Zero padding fallback.
        return rtrim($plain, "\0");
    }
}
