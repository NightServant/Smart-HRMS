<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateAdminUserRequest;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class UserManagementController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        $search = trim((string) $request->string('search'));
        $role = trim((string) $request->string('role'));
        $status = trim((string) $request->string('status'));
        $twoFactor = trim((string) $request->string('twoFactor'));
        $perPage = max(5, min(50, (int) $request->integer('perPage', 10)));
        $sort = (string) $request->string('sort', 'name');
        $direction = strtolower((string) $request->string('direction', 'asc'));

        return to_route('admin.employee-directory', array_filter([
            'accountSearch' => $search !== '' ? $search : null,
            'accountRole' => $role !== '' ? $role : null,
            'accountStatus' => $status !== '' ? $status : null,
            'accountTwoFactor' => $twoFactor !== '' ? $twoFactor : null,
            'accountSort' => $sort !== 'name' ? $sort : null,
            'accountDirection' => $direction !== 'asc' ? $direction : null,
            'accountPerPage' => $perPage !== 10 ? $perPage : null,
            'accountPage' => $request->integer('page') > 1 ? $request->integer('page') : null,
        ], fn (mixed $value): bool => $value !== null));
    }

    public function store(StoreAdminUserRequest $request): RedirectResponse
    {
        $user = User::query()->create([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'role' => $request->string('role')->toString(),
            'employee_id' => $request->input('employee_id'),
            'password' => Hash::make($request->string('password')->toString()),
            'email_verified_at' => now(),
            'is_active' => $request->boolean('is_active'),
        ]);

        ActivityLogger::logUserCreated($user, $request);

        return back()->with('success', 'User account created successfully.');
    }

    public function update(UpdateAdminUserRequest $request, User $user): RedirectResponse
    {
        $isActive = $request->boolean('is_active');

        $this->guardHrPersonnelState($request->user(), $user, $user->role, $isActive);

        $payload = [
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'employee_id' => $request->input('employee_id'),
            'is_active' => $isActive,
        ];

        if ($request->filled('password')) {
            $payload['password'] = Hash::make($request->string('password')->toString());
        }

        $user->update($payload);

        ActivityLogger::logUserUpdated($user, $request);

        return back()->with('success', 'User account updated successfully.');
    }

    public function activate(Request $request, User $user): RedirectResponse
    {
        $this->assertHrPersonnel($request);

        $user->update(['is_active' => true]);

        ActivityLogger::logUserActivated($user, $request);

        return back()->with('success', 'User account activated successfully.');
    }

    public function deactivate(Request $request, User $user): RedirectResponse
    {
        $this->assertHrPersonnel($request);
        $this->guardHrPersonnelState($request->user(), $user, $user->role, false);

        $user->update(['is_active' => false]);

        ActivityLogger::logUserDeactivated($user, $request);

        return back()->with('success', 'User account deactivated successfully.');
    }

    public function sendPasswordReset(Request $request, User $user): RedirectResponse
    {
        $this->assertHrPersonnel($request);

        Password::broker()->sendResetLink([
            'email' => $user->email,
        ]);

        ActivityLogger::logPasswordReset($user, $request);

        return back()->with('success', 'Password reset link sent successfully.');
    }

    private function assertHrPersonnel(Request $request): void
    {
        if (! $request->user()?->hasRole(User::ROLE_HR_PERSONNEL)) {
            abort(403);
        }
    }

    private function guardHrPersonnelState(User $actor, User $subject, string $newRole, bool $newIsActive): void
    {
        if ($actor->is($subject) && ! $newIsActive) {
            throw ValidationException::withMessages([
                'is_active' => 'You cannot deactivate your own HR personnel account.',
            ]);
        }

        if ($subject->role !== User::ROLE_HR_PERSONNEL || (! $subject->is_active && $newRole === User::ROLE_HR_PERSONNEL)) {
            return;
        }

        $remainsActiveHrPersonnel = $newRole === User::ROLE_HR_PERSONNEL && $newIsActive;

        if ($remainsActiveHrPersonnel) {
            return;
        }

        $otherActiveHrPersonnel = User::query()
            ->where('role', User::ROLE_HR_PERSONNEL)
            ->where('is_active', true)
            ->whereKeyNot($subject->getKey())
            ->count();

        if ($otherActiveHrPersonnel === 0) {
            throw ValidationException::withMessages([
                'role' => 'At least one active HR personnel account must remain in the system.',
            ]);
        }
    }
}
