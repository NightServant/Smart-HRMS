<?php

namespace App\Http\Middleware;

use App\Services\Biometric\BiometricSyncService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TriggerBiometricSync
{
    private const COOLDOWN_KEY = 'biometric:sync:last-run';

    private const COOLDOWN_SECONDS = 30;

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('GET')) {
            return $next($request);
        }

        if ($request->header('X-Inertia-Partial-Component')) {
            return $next($request);
        }

        if (! config('services.zkbiotime.url')) {
            return $next($request);
        }

        if (Cache::has(self::COOLDOWN_KEY)) {
            return $next($request);
        }

        Cache::put(self::COOLDOWN_KEY, now()->toIso8601String(), self::COOLDOWN_SECONDS);

        $response = $next($request);

        app()->terminating(function (): void {
            try {
                app(BiometricSyncService::class)->sync();
            } catch (Throwable $e) {
                report($e);
            }
        });

        return $response;
    }
}
