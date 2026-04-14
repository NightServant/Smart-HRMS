<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateAdminUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole(User::ROLE_ADMINISTRATOR) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $employeeId = trim((string) $this->input('employee_id', ''));

        $this->merge([
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'employee_id' => $employeeId !== '' ? $employeeId : null,
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'role' => ['required', 'string', Rule::in(User::roles())],
            'employee_id' => ['nullable', 'string', 'exists:employees,employee_id', Rule::unique('users', 'employee_id')->ignore($user)],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.unique' => 'This employee record is already linked to another account.',
        ];
    }
}
