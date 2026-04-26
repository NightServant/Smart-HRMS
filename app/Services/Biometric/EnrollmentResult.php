<?php

namespace App\Services\Biometric;

class EnrollmentResult
{
    public function __construct(
        public string $employeeId,
        public string $deviceUserId,
        public string $terminalSn,
        public ?string $terminalName,
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
            'terminal_sn' => $this->terminalSn,
            'terminal_name' => $this->terminalName,
            'status' => $this->status,
            'instructions' => $this->instructions,
        ];
    }
}
