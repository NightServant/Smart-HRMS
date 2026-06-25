<?php

namespace App\Http\Requests;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\User;
use App\Support\DepartmentPositionPolicy;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === User::ROLE_HR_PERSONNEL;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'department_name' => trim((string) $this->input('department_name', '')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Employee $employee */
        $employee = $this->route('employee');

        /** @var User|null $linkedUser */
        $linkedUser = $employee->user;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($linkedUser?->id),
            ],
            'department_mode' => ['required', 'string', Rule::in(['existing', 'new'])],
            'department_id' => ['nullable', 'integer', 'required_if:department_mode,existing', 'exists:departments,id'],
            'department_name' => ['nullable', 'string', 'required_if:department_mode,new', 'max:255'],
            'position_id' => ['required', 'integer', 'exists:employee_positions,id'],
            'employment_status' => ['required', 'string', Rule::in(['permanent', 'casual', 'job_order'])],
            'date_hired' => ['required', 'date'],
            'is_active' => ['required', 'boolean'],
            'zkteco_pin_override' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
                Rule::unique('employees', 'zkteco_pin')->ignore($employee->employee_id, 'employee_id'),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Employee $employee */
            $employee = $this->route('employee');
            $actor = $this->user();
            $linkedUser = $employee->user;

            $departmentName = $this->resolveDepartmentName();
            $positionName = $this->resolvePositionName();

            // Department-position allowlist enforcement.
            if ($departmentName !== null && $positionName !== null
                && ! DepartmentPositionPolicy::isAllowed($departmentName, $positionName)
            ) {
                $allowed = DepartmentPositionPolicy::allowedPositionsFor($departmentName);
                $validator->errors()->add(
                    'position_id',
                    sprintf(
                        '%s only allows the following positions: %s.',
                        $departmentName,
                        implode(', ', $allowed),
                    ),
                );
            }

            // HR self-modification guard: an HR personnel user may not change
            // their own department or position via this endpoint. Admins
            // (and HR editing other employees) remain unaffected.
            if ($actor !== null
                && $linkedUser !== null
                && $actor->is($linkedUser)
                && $actor->role === User::ROLE_HR_PERSONNEL
            ) {
                $submittedDepartmentId = $this->input('department_mode') === 'new'
                    ? null
                    : (int) $this->input('department_id');
                $submittedPositionId = (int) $this->input('position_id');

                if ($this->input('department_mode') === 'new'
                    || ($submittedDepartmentId !== (int) $employee->department_id)
                ) {
                    $validator->errors()->add(
                        'department_id',
                        'You cannot change your own department.',
                    );
                }

                if ($submittedPositionId !== (int) $employee->position_id) {
                    $validator->errors()->add(
                        'position_id',
                        'You cannot change your own position.',
                    );
                }
            }
        });
    }

    private function resolveDepartmentName(): ?string
    {
        if ($this->input('department_mode') === 'new') {
            $name = trim((string) $this->input('department_name', ''));

            return $name === '' ? null : $name;
        }

        $id = $this->input('department_id');
        if (! is_numeric($id)) {
            return null;
        }

        return Department::query()->whereKey((int) $id)->value('name');
    }

    private function resolvePositionName(): ?string
    {
        $id = $this->input('position_id');
        if (! is_numeric($id)) {
            return null;
        }

        return EmployeePosition::query()->whereKey((int) $id)->value('name');
    }

    public function messages(): array
    {
        return [
            'department_id.required_if' => 'Please select a department.',
            'department_name.required_if' => 'Please enter a department name.',
            'employment_status.in' => 'Employment status must be Permanent, Casual, or Job Order.',
        ];
    }
}
