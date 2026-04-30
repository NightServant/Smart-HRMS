<?php

namespace App\Http\Responses;

use App\Models\User;
use App\Support\SafeIntendedRedirect;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        $user = $request instanceof Request ? $request->user() : null;

        if (! $user instanceof User) {
            if ($request instanceof Request) {
                $request->session()->forget('url.intended');
            }

            return redirect(config('fortify.home'));
        }

        if ($user->hasRole(User::ROLE_EMPLOYEE) && $user->must_change_password) {
            $request->session()->forget('url.intended');

            return redirect(route('first-login-password-prompt', absolute: false));
        }

        $intended = SafeIntendedRedirect::pullForUser($request, $user);

        if ($intended !== null) {
            return redirect($intended);
        }

        return redirect(route($user->homeRouteName(), absolute: false));
    }
}
