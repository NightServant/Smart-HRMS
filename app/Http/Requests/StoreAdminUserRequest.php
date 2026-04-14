<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreAdminUserRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', Rule::in(User::roles())],
            'employee_id' => ['nullable', 'string', 'exists:employees,employee_id', 'unique:users,employee_id'],
            'password' => ['required', 'confirmed', Password::defaults()],
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
