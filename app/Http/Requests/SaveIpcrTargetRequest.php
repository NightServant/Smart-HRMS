<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveIpcrTargetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->employee !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'semester' => 'required|integer|in:1,2',
            'target_year' => 'required|integer|min:2020|max:2035',
            'form_payload' => 'required|array',
            'action' => 'required|string|in:save,submit',
        ];
    }
}
