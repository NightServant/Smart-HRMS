<?php

namespace App\Http\Responses;

use App\Models\User;
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
            return redirect()->intended(config('fortify.home').'?verified=1');
        }

        return redirect()->intended(route($user->homeRouteName(), absolute: false).'?verified=1');
    }
}
