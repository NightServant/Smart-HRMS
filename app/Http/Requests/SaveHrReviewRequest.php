<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveHrReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'hr_decision' => 'required|string|in:approved,rejected',
            'hr_remarks' => 'required_if:hr_decision,rejected|nullable|string|max:2000',
        ];
    }
}
