<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

class BiometricEnrollmentController extends Controller
{
    /**
     * The standalone biometric enrollment page has been folded into the
     * attendance page. Keep this method as a soft redirect for any bookmarks
     * or older nav links.
     */
    public function show(): RedirectResponse
    {
        return redirect('/attendance');
    }
}
