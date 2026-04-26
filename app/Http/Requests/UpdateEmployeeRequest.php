<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === User::ROLE_HR_PERSONNEL;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'department_name' => trim((string) $this->input('department_name', '')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\Employee $employee */
        $employee = $this->route('employee');

        /** @var \App\Models\User|null $linkedUser */
        $linkedUser = $employee->user;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($linkedUser?->id),
            ],
            'department_mode' => ['required', 'string', Rule::in(['existing', 'new'])],
            'department_id' => ['nullable', 'integer', 'required_if:department_mode,existing', 'exists:departments,id'],
            'department_name' => ['nullable', 'string', 'required_if:department_mode,new', 'max:255'],
            'position_id' => ['required', 'integer', 'exists:employee_positions,id'],
            'employment_status' => ['required', 'string', Rule::in(['regular', 'casual', 'job_order'])],
            'date_hired' => ['required', 'date'],
            'zkteco_pin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('employees', 'zkteco_pin')->ignore($employee->employee_id, 'employee_id'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'department_id.required_if' => 'Please select a department.',
            'department_name.required_if' => 'Please enter a department name.',
            'employment_status.in' => 'Employment status must be Regular, Casual, or Job Order.',
        ];
    }
}
