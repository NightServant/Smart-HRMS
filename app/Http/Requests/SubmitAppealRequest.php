<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAppealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'appeal_reason' => 'required|string|max:2000',
            'appeal_evidence_description' => 'nullable|string|max:2000',
            'evidence_files' => 'required|array|min:1',
            'evidence_files.*' => 'file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ];
    }
}
