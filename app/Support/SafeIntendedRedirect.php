<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Throwable;

class SafeIntendedRedirect
{
    /**
     * Pull the session's intended URL and return it as a relative path
     * only when the given user is permitted to access that route. Returns
     * null when there is no intended URL, the URL cannot be resolved to
     * a registered route, or the user's role is not allowed by the route's
     * `role:` middleware. The intended URL is always cleared from session.
     */
    public static function pullForUser(Request $request, User $user): ?string
    {
        $intended = $request->session()->pull('url.intended');

        if (! is_string($intended) || $intended === '') {
            return null;
        }

        $path = parse_url($intended, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return null;
        }

        $query = parse_url($intended, PHP_URL_QUERY);
        $relative = $path.(is_string($query) && $query !== '' ? '?'.$query : '');

        try {
            $route = Route::getRoutes()->match(Request::create($relative));
        } catch (Throwable) {
            return null;
        }

        foreach ($route->gatherMiddleware() as $middleware) {
            if (! is_string($middleware) || ! str_starts_with($middleware, 'role:')) {
                continue;
            }

            $allowed = explode(',', substr($middleware, 5));

            if (! in_array($user->role, $allowed, true)) {
                return null;
            }
        }

        return $relative;
    }
}
