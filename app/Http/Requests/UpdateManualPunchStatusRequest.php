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
        $enabling = $this->boolean('manual_punch_enabled');

        return [
            'manual_punch_enabled' => ['required', 'boolean'],
            'reason' => $enabling ? ['required', 'string', 'max:500'] : ['nullable', 'string', 'max:500'],
            'start_date' => $enabling ? ['required', 'date', 'after_or_equal:today'] : ['nullable', 'date'],
            'end_date' => $enabling ? ['required', 'date', 'after_or_equal:start_date'] : ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'manual_punch_enabled.boolean' => 'Manual punch status must be Enabled or Disabled.',
            'reason.required' => 'A reason is required when enabling manual punch.',
            'reason.max' => 'The reason may not exceed 500 characters.',
            'start_date.required' => 'A start date is required when enabling manual punch.',
            'start_date.after_or_equal' => 'The start date must be today or a future date.',
            'end_date.required' => 'An end date is required when enabling manual punch.',
            'end_date.after_or_equal' => 'The end date must be on or after the start date.',
        ];
    }
}
