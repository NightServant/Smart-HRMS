<?php

namespace App\Http\Requests\Biometric;

use Illuminate\Foundation\Http\FormRequest;

class SyncRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'hr-personnel';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'device' => ['nullable', 'string', 'max:50'],
            'since' => ['nullable', 'date_format:Y-m-d H:i:s'],
        ];
    }
}
