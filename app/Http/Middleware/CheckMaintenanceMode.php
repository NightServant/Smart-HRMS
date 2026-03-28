<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip for unauthenticated users — let them reach login/register pages
        if ($user === null) {
            return $next($request);
        }

        // Allow admin users through always
        if ($user->role === User::ROLE_ADMINISTRATOR) {
            return $next($request);
        }

        // Check if maintenance mode is enabled
        $maintenanceMode = SystemSetting::get('maintenance_mode', false);

        if ($maintenanceMode) {
            $message = SystemSetting::get('maintenance_message')
                ?? 'The system is currently undergoing maintenance. Please try again later.';

            // Allow logout and the maintenance page itself through
            if ($request->routeIs('logout') || $request->routeIs('maintenance')) {
                return $next($request);
            }

            // For Inertia requests, redirect to avoid method mismatch issues
            if ($request->header('X-Inertia')) {
                return Inertia::location('/maintenance');
            }

            return Inertia::render('maintenance', [
                'message' => $message,
            ])->toResponse($request);
        }

        return $next($request);
    }
}
