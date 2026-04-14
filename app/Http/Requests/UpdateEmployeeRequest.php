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
            'job_title' => ['required', 'string', 'max:255'],
            'employment_status' => ['required', 'string', Rule::in(['regular', 'casual', 'job_order'])],
            'date_hired' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'employment_status.in' => 'Employment status must be Regular, Casual, or Job Order.',
        ];
    }
}
