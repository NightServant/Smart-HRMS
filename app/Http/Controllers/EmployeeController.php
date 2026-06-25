<?php

namespace App\Http\Controllers;

use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    /**
     * @return array<int, array<string, int|string>>
     */
    private function employeePayload(): array
    {
        return User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'position' => 'Employee',
                'date_hired' => $user->created_at?->format('Y-m-d') ?? '-',
                'age' => 'N/A',
            ])
            ->all();
    }

    public function employeeDirectory(): Response
    {
        return Inertia::render('admin/employee-directory', [
            'employees' => $this->employeePayload(),
        ]);
    }

    public function documentManagement(): Response
    {
        return Inertia::render('document-management', [
            'employees' => $this->employeePayload(),
        ]);
    }
}
