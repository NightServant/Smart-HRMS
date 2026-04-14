<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Auth\CaseSensitiveEmailUserProvider;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void {}

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::provider('eloquent-case-sensitive', function ($app, array $config) {
            return new CaseSensitiveEmailUserProvider($app['hash'], $config['model']);
        });

        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::authenticateUsing(function (Request $request): ?User {
            $email = $request->string('email')->toString();
            $user = User::query()->where('email', $email)->first();
            $caseMatch = $user ? ($user->email === $email) : null;
            if ($user && ! $caseMatch) {
                $user = null;
            }

            $privatePem = $request->session()->get('login_rsa_private_key');
            $encryptedPassword = $request->string('password')->toString();
            $password = '';

            if ($privatePem && base64_decode($encryptedPassword, true) !== false) {
                $decoded = base64_decode($encryptedPassword);
                $decrypted = '';
                if (openssl_private_decrypt($decoded, $decrypted, $privatePem, OPENSSL_PKCS1_OAEP_PADDING)) {
                    $password = $decrypted;
                } else {
                    $password = $encryptedPassword;
                }
            } else {
                $password = $encryptedPassword;
            }

            if (! $user || ! Hash::check($password, $user->password)) {
                return null;
            }

            if (! $user->is_active) {
                event(new Lockout($request));

                throw ValidationException::withMessages([
                    Fortify::username() => 'This account has been deactivated. Please contact an administrator.',
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(function (Request $request) {
            $keyPair = openssl_pkey_new([
                'private_key_bits' => 2048,
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
            ]);

            openssl_pkey_export($keyPair, $privatePem);
            $details = openssl_pkey_get_details($keyPair);
            $publicPem = $details['key'];

            $request->session()->put('login_rsa_private_key', $privatePem);

            return Inertia::render('auth/login', [
                'canResetPassword' => Features::enabled(Features::resetPasswords()),
                'canRegister' => Features::enabled(Features::registration()),
                'status' => $request->session()->get('status'),
                'publicKey' => $publicPem,
            ]);
        });

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register'));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
