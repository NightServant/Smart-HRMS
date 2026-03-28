<?php

namespace App\Listeners;

use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Logout;

class LogSuccessfulLogout
{
    public function handle(Logout $event): void
    {
        if ($event->user instanceof \App\Models\User) {
            ActivityLogger::logLogout(request(), $event->user);
        }
    }
}
