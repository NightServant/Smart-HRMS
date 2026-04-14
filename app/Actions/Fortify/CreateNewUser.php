<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'employee_id' => ['nullable', 'string', 'exists:employees,employee_id'],
        ])->validate();

        $employeeId = $input['employee_id'] ?? null;

        // If employee_id provided, verify it's not already linked to another user
        if ($employeeId) {
            $existingUser = User::query()->where('employee_id', $employeeId)->first();
            if ($existingUser) {
                $employeeId = null; // Already linked, don't double-assign
            }
        }

        return User::create([
            'name' => $input['name'],
            'email' => Str::lower($input['email']),
            'password' => $input['password'],
            'role' => User::ROLE_EMPLOYEE,
            'employee_id' => $employeeId,
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
    }
}
