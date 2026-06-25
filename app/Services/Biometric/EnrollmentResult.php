<?php

namespace App\Services\Biometric;

class EnrollmentResult
{
    public function __construct(
        public string $employeeId,
        public string $deviceUserId,
        public string $departmentId,
        public ?string $departmentName,
        public string $status,
        public string $instructions,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'employee_id' => $this->employeeId,
            'device_user_id' => $this->deviceUserId,
            'department_id' => $this->departmentId,
            'department_name' => $this->departmentName,
            'status' => $this->status,
            'instructions' => $this->instructions,
        ];
    }
}
