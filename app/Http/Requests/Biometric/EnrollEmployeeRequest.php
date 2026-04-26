<?php

namespace App\Http\Requests\Biometric;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EnrollEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'hr-personnel';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'string', Rule::exists('employees', 'employee_id')],
            'terminal_sn' => ['required', 'string', 'max:50'],
        ];
    }
}
