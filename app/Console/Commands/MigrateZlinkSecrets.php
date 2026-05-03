<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use Illuminate\Console\Command;

/**
 * One-shot command that pulls the current Zlink credentials from env (via
 * config()) and writes them into encrypted system_settings rows. Idempotent:
 * running it again overwrites the stored values with the current env, so it
 * doubles as a "re-encrypt with new APP_KEY" tool after key rotation.
 */
class MigrateZlinkSecrets extends Command
{
    protected $signature = 'zlink:secrets:migrate
        {--prune : After migrating, prompt before clearing the plaintext env values from the running process (file-level cleanup is still manual)}';

    protected $description = 'Move Zlink credentials from .env into encrypted system_settings rows.';

    /**
     * Map of system_settings key → config dotted path.
     *
     * @var array<string, string>
     */
    private const SECRETS = [
        'zlink.app_key' => 'services.zlink.app_key',
        'zlink.app_secret' => 'services.zlink.app_secret',
        'zlink.signature_token' => 'services.zlink.signature_token',
        'zlink.encryption_key' => 'services.zlink.encryption_key',
        'zlink.portal_username' => 'services.zlink.portal_username',
        'zlink.portal_password' => 'services.zlink.portal_password',
    ];

    public function handle(): int
    {
        $migrated = 0;
        $skipped = 0;

        foreach (self::SECRETS as $dbKey => $configPath) {
            $value = config($configPath);

            if (! is_string($value) || $value === '') {
                $this->components->warn("Skipping {$dbKey}: {$configPath} is empty in env.");
                $skipped++;

                continue;
            }

            SystemSetting::setEncrypted(
                key: $dbKey,
                plaintext: $value,
                userId: null,
                group: 'zlink',
                label: $this->labelFor($dbKey),
                description: $this->descriptionFor($dbKey),
            );

            $this->components->info("Encrypted and stored {$dbKey}.");
            $migrated++;
        }

        $this->newLine();
        $this->components->info("Migrated {$migrated} secret(s); skipped {$skipped}.");

        if ($migrated > 0) {
            $this->components->warn('Now remove the plaintext values from your .env file. Reminders:');
            $this->line('  • Comment out or delete: ZLINK_APP_KEY, ZLINK_APP_SECRET, ZLINK_SIGNATURE_TOKEN,');
            $this->line('    ZLINK_ENCRYPTION_KEY, ZLINK_PORTAL_USERNAME, ZLINK_PORTAL_PASSWORD');
            $this->line('  • Restart any long-running workers (queue, horizon) so they re-read config().');
            $this->line('  • Rotate the Zlink portal password — its plaintext was previously on disk.');
        }

        return self::SUCCESS;
    }

    private function labelFor(string $key): string
    {
        return match ($key) {
            'zlink.app_key' => 'Zlink Open API App Key',
            'zlink.app_secret' => 'Zlink Open API App Secret',
            'zlink.signature_token' => 'Zlink Webhook Signature Token',
            'zlink.encryption_key' => 'Zlink Webhook Encryption Key',
            'zlink.portal_username' => 'Zlink Admin Portal Username',
            'zlink.portal_password' => 'Zlink Admin Portal Password',
            default => $key,
        };
    }

    private function descriptionFor(string $key): ?string
    {
        return match ($key) {
            'zlink.portal_password' => 'Owner-tier portal password used to call /customer/dcc/device/remoteRegistration. Rotate from the Zlink web UI; this command must be re-run after rotation.',
            'zlink.app_secret' => 'Open Platform app secret paired with app_key. Used for tenantToken authentication.',
            'zlink.signature_token' => 'HMAC token used to verify inbound webhook signatures.',
            'zlink.encryption_key' => 'AES IV used to decrypt webhook encryptData payloads.',
            default => null,
        };
    }
}
