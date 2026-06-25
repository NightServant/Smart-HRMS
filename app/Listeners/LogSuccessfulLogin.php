<?php

namespace App\Listeners;

use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Login;

class LogSuccessfulLogin
{
    public function handle(Login $event): void
    {
        if ($event->user instanceof \App\Models\User) {
            ActivityLogger::logLogin(request(), $event->user);
        }
    }
}
