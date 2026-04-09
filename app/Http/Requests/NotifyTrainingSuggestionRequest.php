<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NotifyTrainingSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'submission_id' => 'required|integer|exists:ipcr_submissions,id',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'submission_id.required' => 'Please select the IPCR submission to notify.',
            'submission_id.exists' => 'The selected IPCR submission could not be found.',
        ];
    }
}
