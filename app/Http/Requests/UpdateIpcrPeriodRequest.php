<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIpcrPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('hr-personnel') ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_open' => ['required', 'boolean'],
            'label' => ['required', 'string', 'max:255'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.required' => 'Please provide the semester label for the evaluation period.',
            'year.required' => 'Please provide the evaluation year.',
        ];
    }
}
