<?php

namespace App\Http\Controllers;

use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class FirstLoginPasswordPromptController extends Controller
{
    public function show(): Response|\Illuminate\Http\RedirectResponse
    {
        /** @var User $user */
        $user = auth()->user();

        if (! $user->hasRole(User::ROLE_EMPLOYEE) || ! $user->must_change_password) {
            return redirect()->route($user->homeRouteName());
        }

        return Inertia::render('auth/first-login-password-prompt');
    }
}
