<?php

namespace App\Http\Responses;

use App\Models\User;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Laravel\Fortify\Fortify;

class RedirectAsIntended implements Responsable
{
    public function __construct(public string $name) {}

    public function toResponse($request)
    {
        $user = $request instanceof Request ? $request->user() : null;

        if ($this->name === 'email-verification' && $user instanceof User) {
            return redirect()->intended(route($user->homeRouteName(), absolute: false));
        }

        return redirect()->intended(Fortify::redirects($this->name));
    }
}
