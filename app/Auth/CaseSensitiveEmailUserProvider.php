<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Extends the default Eloquent provider to enforce exact-case email matching.
 *
 * The database collation (utf8mb4_unicode_ci) is case-insensitive, so a plain
 * WHERE clause would match "mAria@example.com" against "maria@example.com".
 * After the DB lookup we do a strict PHP string comparison to reject any input
 * whose casing differs from the stored email.
 */
class CaseSensitiveEmailUserProvider extends EloquentUserProvider
{
    /**
     * @param  array<string, mixed>  $credentials
     */
    public function retrieveByCredentials(array $credentials): ?Authenticatable
    {
        $user = parent::retrieveByCredentials($credentials);

        if ($user && isset($credentials['email']) && $user->email !== $credentials['email']) {
            return null;
        }

        return $user;
    }
}
