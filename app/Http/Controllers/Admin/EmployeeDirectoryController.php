<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EmployeeDirectoryController extends Controller
{
    /**
     * Create a new Employee and associated User account.
     */
    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $employee = Employee::query()->create([
                'employee_id' => $validated['employee_id'],
                'name' => $validated['name'],
                'job_title' => $validated['job_title'],
                'employment_status' => $validated['employment_status'],
                'date_hired' => $validated['date_hired'],
            ]);

            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'employee_id' => $employee->employee_id,
                'role' => User::ROLE_EMPLOYEE,
                'password' => Hash::make(Str::random(16)),
                'email_verified_at' => now(),
                'is_active' => true,
            ]);

            ActivityLog::log(
                'employee.create',
                "Created employee record for {$employee->name} ({$employee->employee_id}).",
                $request,
                [
                    'employee_id' => $employee->employee_id,
                    'user_id' => $user->id,
                ]
            );
        });

        return back()->with('success', 'Employee created successfully.');
    }

    /**
     * Update an existing Employee and their linked User account.
     */
    public function update(UpdateEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $employee, $request): void {
            $employee->update([
                'name' => $validated['name'],
                'job_title' => $validated['job_title'],
                'employment_status' => $validated['employment_status'],
                'date_hired' => $validated['date_hired'],
            ]);

            if ($employee->user !== null) {
                $employee->user->update([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                ]);
            }

            ActivityLog::log(
                'employee.update',
                "Updated employee record for {$employee->name} ({$employee->employee_id}).",
                $request,
                [
                    'employee_id' => $employee->employee_id,
                ]
            );
        });

        return back()->with('success', 'Employee updated successfully.');
    }

    /**
     * Delete an Employee and their linked User account.
     */
    public function destroy(Employee $employee): RedirectResponse
    {
        $name = $employee->name;
        $employeeId = $employee->employee_id;

        DB::transaction(function () use ($employee): void {
            $employee->user?->delete();
            $employee->delete();
        });

        ActivityLog::log(
            'employee.delete',
            "Deleted employee record for {$name} ({$employeeId}).",
            request(),
            [
                'employee_id' => $employeeId,
            ]
        );

        return back()->with('success', 'Employee deleted successfully.');
    }
}
