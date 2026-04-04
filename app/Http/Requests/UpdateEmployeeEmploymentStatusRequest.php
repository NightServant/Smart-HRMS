<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeEmploymentStatusRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === User::ROLE_HR_PERSONNEL;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'employment_status' => ['required', 'string', Rule::in(['regular', 'casual', 'job_order'])],
        ];
    }

    public function messages(): array
    {
        return [
            'employment_status.in' => 'Employment status must be Regular, Casual, or Job Order.',
        ];
    }
}
