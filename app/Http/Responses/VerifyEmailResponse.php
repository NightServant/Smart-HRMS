<?php

namespace App\Http\Responses;

use App\Models\User;
use App\Support\SafeIntendedRedirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;

class VerifyEmailResponse implements VerifyEmailResponseContract
{
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 204);
        }

        $user = $request instanceof Request ? $request->user() : null;

        if (! $user instanceof User) {
            if ($request instanceof Request) {
                $request->session()->forget('url.intended');
            }

            return redirect(config('fortify.home').'?verified=1');
        }

        $intended = SafeIntendedRedirect::pullForUser($request, $user);

        $target = $intended ?? route($user->homeRouteName(), absolute: false);

        return redirect($target.(str_contains($target, '?') ? '&' : '?').'verified=1');
    }
}
