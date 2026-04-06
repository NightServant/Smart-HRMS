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
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * @param  array<string, string>  $allowedSorts
     * @return array{sort: string, direction: string}
     */
    private function resolveSort(Request $request, array $allowedSorts, string $defaultSort): array
    {
        $requestedSort = (string) $request->string('sort', $defaultSort);
        $requestedDirection = strtolower((string) $request->string('direction', 'asc'));

        return [
            'sort' => array_key_exists($requestedSort, $allowedSorts) ? $requestedSort : $defaultSort,
            'direction' => in_array($requestedDirection, ['asc', 'desc'], true) ? $requestedDirection : 'asc',
        ];
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $role = trim((string) $request->string('role'));
        $status = trim((string) $request->string('status'));
        $twoFactor = trim((string) $request->string('twoFactor'));
        $perPage = max(5, min(50, (int) $request->integer('perPage', 10)));
        $allowedSorts = [
            'name' => 'users.name',
            'email' => 'users.email',
            'role' => 'users.role',
            'created_at' => 'users.created_at',
        ];
        ['sort' => $sort, 'direction' => $direction] = $this->resolveSort($request, $allowedSorts, 'name');

        $users = User::query()
            ->with('employee')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('employee_id', 'like', '%'.$search.'%');
                });
            })
            ->when($role !== '', fn ($query) => $query->where('role', $role))
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->when($twoFactor === 'enabled', fn ($query) => $query->whereNotNull('two_factor_confirmed_at'))
            ->when($twoFactor === 'disabled', fn ($query) => $query->whereNull('two_factor_confirmed_at'))
            ->orderBy($allowedSorts[$sort], $direction)
            ->when($sort !== 'name', fn ($query) => $query->orderBy('users.name'))
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'employeeId' => $user->employee_id,
                'position' => $user->employee?->job_title,
                'twoFactorEnabled' => $user->two_factor_confirmed_at !== null,
                'isActive' => (bool) $user->is_active,
                'createdAt' => $user->created_at?->format('Y-m-d H:i:s'),
                'links' => [
                    'update' => "/admin/user-management/{$user->id}",
                    'activate' => "/admin/user-management/{$user->id}/activate",
                    'deactivate' => "/admin/user-management/{$user->id}/deactivate",
                ],
            ]);

        return Inertia::render('admin/user-management', [
            'users' => $users->items(),
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
                'twoFactor' => $twoFactor,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'roles' => User::roles(),
            'pagination' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
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
        $newRole = $request->string('role')->toString();
        $isActive = $request->boolean('is_active');

        $this->guardAdminState($request->user(), $user, $newRole, $isActive);

        $payload = [
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'role' => $newRole,
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
        $this->assertAdministrator($request);

        $user->update(['is_active' => true]);

        ActivityLogger::logUserActivated($user, $request);

        return back()->with('success', 'User account activated successfully.');
    }

    public function deactivate(Request $request, User $user): RedirectResponse
    {
        $this->assertAdministrator($request);
        $this->guardAdminState($request->user(), $user, $user->role, false);

        $user->update(['is_active' => false]);

        ActivityLogger::logUserDeactivated($user, $request);

        return back()->with('success', 'User account deactivated successfully.');
    }

    public function sendPasswordReset(Request $request, User $user): RedirectResponse
    {
        $this->assertAdministrator($request);

        Password::broker()->sendResetLink([
            'email' => $user->email,
        ]);

        ActivityLogger::logPasswordReset($user, $request);

        return back()->with('success', 'Password reset link sent successfully.');
    }

    private function assertAdministrator(Request $request): void
    {
        if (! $request->user()?->hasRole(User::ROLE_ADMINISTRATOR)) {
            abort(403);
        }
    }

    private function guardAdminState(User $actor, User $subject, string $newRole, bool $newIsActive): void
    {
        if ($actor->is($subject) && ! $newIsActive) {
            throw ValidationException::withMessages([
                'is_active' => 'You cannot deactivate your own administrator account.',
            ]);
        }

        if ($subject->role !== User::ROLE_ADMINISTRATOR || (! $subject->is_active && $newRole === User::ROLE_ADMINISTRATOR)) {
            return;
        }

        $remainsActiveAdministrator = $newRole === User::ROLE_ADMINISTRATOR && $newIsActive;

        if ($remainsActiveAdministrator) {
            return;
        }

        $otherActiveAdministrators = User::query()
            ->where('role', User::ROLE_ADMINISTRATOR)
            ->where('is_active', true)
            ->whereKeyNot($subject->getKey())
            ->count();

        if ($otherActiveAdministrators === 0) {
            throw ValidationException::withMessages([
                'role' => 'At least one active administrator account must remain in the system.',
            ]);
        }
    }
}
