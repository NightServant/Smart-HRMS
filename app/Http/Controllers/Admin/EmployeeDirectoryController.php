<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\User;
use App\Notifications\EmployeeAccountCredentialsNotification;
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
        $temporaryPassword = Str::random(12);
        $employee = null;
        $user = null;

        DB::transaction(function () use ($validated, $request, $temporaryPassword, &$employee, &$user): void {
            $employeeId = Employee::nextEmployeeId(lockForUpdate: true);
            $department = $this->resolveDepartment($validated);
            $position = EmployeePosition::query()->findOrFail($validated['position_id']);

            $employee = Employee::query()->create([
                'employee_id' => $employeeId,
                'name' => $validated['name'],
                'job_title' => $position->name,
                'department_id' => $department->id,
                'position_id' => $position->id,
                'employment_status' => $validated['employment_status'],
                'date_hired' => $validated['date_hired'],
            ]);

            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'employee_id' => $employee->employee_id,
                'role' => User::ROLE_EMPLOYEE,
                'password' => Hash::make($temporaryPassword),
                'email_verified_at' => now(),
                'is_active' => true,
                'must_change_password' => true,
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

        $user?->notify(new EmployeeAccountCredentialsNotification(
            employeeName: $employee?->name ?? $validated['name'],
            employeeId: $employee?->employee_id ?? '',
            email: $validated['email'],
            temporaryPassword: $temporaryPassword,
        ));

        return back()
            ->with('success', 'Employee created successfully and the linked account is ready to sign in.')
            ->with('employeeAccountCredentials', [
                'employeeName' => $employee?->name ?? $validated['name'],
                'employeeId' => $employee?->employee_id ?? '',
                'email' => $validated['email'],
                'temporaryPassword' => $temporaryPassword,
            ]);
    }

    /**
     * Update an existing Employee and their linked User account.
     */
    public function update(UpdateEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $validated = $request->validated();
        $createdLinkedAccount = false;
        $temporaryPassword = null;

        DB::transaction(function () use ($validated, $employee, $request, &$createdLinkedAccount, &$temporaryPassword): void {
            $department = $this->resolveDepartment($validated);
            $position = EmployeePosition::query()->findOrFail($validated['position_id']);

            $employee->update([
                'name' => $validated['name'],
                'job_title' => $position->name,
                'department_id' => $department->id,
                'position_id' => $position->id,
                'employment_status' => $validated['employment_status'],
                'date_hired' => $validated['date_hired'],
                'zkteco_pin' => $validated['zkteco_pin'] ?? null,
            ]);

            if ($employee->user !== null) {
                $employee->user->update([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                ]);
            } else {
                $temporaryPassword = Str::random(12);

                $linkedUser = User::query()->create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'employee_id' => $employee->employee_id,
                    'role' => User::ROLE_EMPLOYEE,
                    'password' => Hash::make($temporaryPassword),
                    'email_verified_at' => now(),
                    'is_active' => true,
                    'must_change_password' => true,
                ]);

                $linkedUser->notify(new EmployeeAccountCredentialsNotification(
                    employeeName: $employee->name,
                    employeeId: $employee->employee_id,
                    email: $validated['email'],
                    temporaryPassword: $temporaryPassword,
                ));

                $createdLinkedAccount = true;
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

        if ($createdLinkedAccount) {
            return back()
                ->with('success', 'Employee updated successfully and a linked account was created.')
                ->with('employeeAccountCredentials', [
                    'employeeName' => $employee->name,
                    'employeeId' => $employee->employee_id,
                    'email' => $validated['email'],
                    'temporaryPassword' => $temporaryPassword,
                ]);
        }

        return back()->with('success', 'Employee updated successfully.');
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveDepartment(array $validated): Department
    {
        if (($validated['department_mode'] ?? 'existing') === 'new') {
            return Department::query()->firstOrCreate([
                'name' => $validated['department_name'],
            ]);
        }

        return Department::query()->findOrFail($validated['department_id']);
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
