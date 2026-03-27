<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->loadMissing('employee');
        $shouldShowEmployeeProfile = in_array($user->role, [User::ROLE_EMPLOYEE, User::ROLE_EVALUATOR], true);
        $employee = $shouldShowEmployeeProfile ? $user->employee : null;

        return Inertia::render('settings/profile', [
            'status' => $request->session()->get('status'),
            'canEditProfile' => $user->isAdministrator(),
            'accountProfile' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'employeeId' => $user->employee_id,
            ],
            'employeeProfile' => $employee ? [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'job_title' => $employee->job_title,
                'supervisor_id' => $employee->supervisor_id,
            ] : null,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());
        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
