<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSeminarsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'time' => ['nullable', 'string', 'max:255'],
            'speaker' => ['nullable', 'string', 'max:255'],
            'target_performance_area' => ['required', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'The seminar title is required.',
            'date.required' => 'The seminar date is required.',
        ];
    }
}
