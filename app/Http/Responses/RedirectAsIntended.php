<?php

namespace App\Http\Responses;

use App\Models\User;
use App\Support\SafeIntendedRedirect;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Laravel\Fortify\Fortify;

class RedirectAsIntended implements Responsable
{
    public function __construct(public string $name) {}

    public function toResponse($request)
    {
        $user = $request instanceof Request ? $request->user() : null;

        if ($user instanceof User) {
            $intended = SafeIntendedRedirect::pullForUser($request, $user);

            if ($intended !== null) {
                return redirect($intended);
            }

            return redirect(route($user->homeRouteName(), absolute: false));
        }

        if ($request instanceof Request) {
            $request->session()->forget('url.intended');
        }

        return redirect(Fortify::redirects($this->name));
    }
}
