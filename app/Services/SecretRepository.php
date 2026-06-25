<?php

namespace App\Services;

use App\Models\SystemSetting;
use Throwable;

/**
 * Reads secret-class configuration values, preferring encrypted storage in
 * `system_settings` and falling back to `config()` (env) when the secret has
 * not been migrated into the database yet.
 *
 * The fallback exists so this layer can be introduced without breaking the
 * boot sequence on a fresh install or in CI: tests and first-run flows still
 * work via env, and a one-time `php artisan zlink:secrets:migrate` moves the
 * values into encrypted DB storage on real environments.
 *
 * Reading is cached by SystemSetting::get(). Decryption happens once per
 * cache window, not per request.
 */
class SecretRepository
{
    /**
     * Look up a secret by its DB key, with optional fallback to a config path.
     *
     * @param  string  $key  The system_settings.key — e.g. "zlink.app_secret".
     * @param  string|null  $configFallback  Dotted config path — e.g. "services.zlink.app_secret".
     */
    public function get(string $key, ?string $configFallback = null): ?string
    {
        try {
            $value = SystemSetting::get($key);

            if (is_string($value) && $value !== '') {
                return $value;
            }
        } catch (Throwable) {
            // SystemSetting::get throws if the table doesn't exist (fresh
            // install before migrate) or if Crypt fails (APP_KEY rotated
            // without re-encrypting). Either way, fall through to env so
            // the request doesn't 500.
        }

        if ($configFallback !== null) {
            $fallback = config($configFallback);

            if (is_string($fallback) && $fallback !== '') {
                return $fallback;
            }
        }

        return null;
    }

    /**
     * Same as get() but raises a RuntimeException if the secret is missing.
     * Use for required credentials whose absence should fail fast at boot.
     */
    public function require(string $key, ?string $configFallback = null): string
    {
        $value = $this->get($key, $configFallback);

        if ($value === null || $value === '') {
            throw new \RuntimeException(sprintf(
                'Required secret "%s" is not configured. Run `php artisan zlink:secrets:migrate` or set the corresponding env var.',
                $key,
            ));
        }

        return $value;
    }
}
