<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitIpcrRequest extends FormRequest
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
            'employee_id' => 'required|string|exists:employees,employee_id',
            'period' => 'required|string|max:120',
            'form_payload' => 'required|array',
            'form_payload.template_version' => 'required|string|max:50',
            'form_payload.metadata' => 'required|array',
            'form_payload.sections' => 'required|array|min:1',
            'form_payload.sections.*.id' => 'required|string',
            'form_payload.sections.*.rows' => 'required|array|min:1',
            'form_payload.sections.*.rows.*.id' => 'required|string',
            'form_payload.sections.*.rows.*.actual_accomplishment' => 'required|string|min:1',
            'form_payload.sections.*.rows.*.ratings' => 'nullable|array',
            'form_payload.sections.*.rows.*.remarks' => 'nullable|string',
            'form_payload.workflow_notes' => 'nullable|array',
            'form_payload.summary' => 'nullable|array',
            'form_payload.sign_off' => 'nullable|array',
            'form_payload.finalization' => 'nullable|array',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'period.required' => 'Please select the active evaluation period.',
            'form_payload.required' => 'The IPCR form details are required before submission.',
        ];
    }
}
