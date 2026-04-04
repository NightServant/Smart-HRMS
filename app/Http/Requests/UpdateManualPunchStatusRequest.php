<?php

namespace App\Http\Requests;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateManualPunchStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $employee = $this->route('employee');

        return $user?->role === User::ROLE_EVALUATOR
            && $employee instanceof Employee
            && $user->employee_id !== null
            && $employee->supervisor_id === $user->employee_id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'manual_punch_enabled' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'manual_punch_enabled.boolean' => 'Manual punch status must be Enabled or Disabled.',
        ];
    }
}
