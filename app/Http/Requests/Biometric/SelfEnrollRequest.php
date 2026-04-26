<?php

namespace App\Http\Requests\Biometric;

use Illuminate\Foundation\Http\FormRequest;

class SelfEnrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'employee'
            && ! empty($this->user()?->employee_id);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'terminal_sn' => ['required', 'string', 'max:50'],
        ];
    }
}
