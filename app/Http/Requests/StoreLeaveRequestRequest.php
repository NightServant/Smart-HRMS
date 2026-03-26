<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreLeaveRequestRequest extends FormRequest
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
            'leaveType' => ['required', 'string', 'in:vacation-leave,force-leave,special-privilege-leave,wellness-leave,sick-leave,special-sick-leave-women,maternity-leave,paternity-leave,solo-parent-leave'],
            'startDate' => ['required', 'date'],
            'endDate' => ['required', 'date', 'after_or_equal:startDate'],
            'reason' => ['required', 'string', 'max:1000'],
            'medicalCertificate' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
            'marriageCertificate' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
            'soloParentId' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $leaveType = (string) $this->input('leaveType');
            $startDate = $this->dateValue('startDate');
            $endDate = $this->dateValue('endDate');

            if (! $startDate || ! $endDate) {
                return;
            }

            $totalDays = $startDate->diffInDays($endDate) + 1;

            $maxDaysByType = [
                'force-leave' => 5,
                'special-privilege-leave' => 3,
                'wellness-leave' => 5,
                'solo-parent-leave' => 7,
            ];

            if (isset($maxDaysByType[$leaveType]) && $totalDays > $maxDaysByType[$leaveType]) {
                $validator->errors()->add('endDate', "Selected leave exceeds {$maxDaysByType[$leaveType]} days for this leave type.");
            }

            if ($leaveType === 'special-sick-leave-women' && $startDate->copy()->addMonthsNoOverflow(3)->lt($endDate)) {
                $validator->errors()->add('endDate', 'Selected leave exceeds the 3-month limit for Special Sick Leave (Women).');
            }

            if ($leaveType === 'sick-leave' && $totalDays > 6 && ! $this->hasFile('medicalCertificate')) {
                $validator->errors()->add('medicalCertificate', 'A medical certificate is required for sick leave longer than 6 days.');
            }

            if ($leaveType === 'maternity-leave' && ! $this->hasFile('marriageCertificate')) {
                $validator->errors()->add('marriageCertificate', 'A marriage certificate is required for maternity leave.');
            }

            if ($leaveType === 'paternity-leave' && ! $this->hasFile('marriageCertificate')) {
                $validator->errors()->add('marriageCertificate', 'A marriage certificate is required for paternity leave.');
            }

            if ($leaveType === 'solo-parent-leave' && ! $this->hasFile('soloParentId')) {
                $validator->errors()->add('soloParentId', 'A solo parent ID is required for solo parent leave.');
            }
        });
    }

    private function dateValue(string $key): ?Carbon
    {
        $value = $this->input($key);

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value);
    }
}
