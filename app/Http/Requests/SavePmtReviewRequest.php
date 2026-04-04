<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SavePmtReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'pmt_decision' => 'required|string|in:approved,rejected',
            'pmt_remarks' => 'required_if:pmt_decision,rejected|nullable|string|max:2000',
        ];
    }
}
