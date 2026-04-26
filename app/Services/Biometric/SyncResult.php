<?php

namespace App\Services\Biometric;

class SyncResult
{
    /**
     * @param  array<int, string>  $issueTypes
     */
    public function __construct(
        public int $recordsFetched = 0,
        public int $recordsStored = 0,
        public int $issues = 0,
        public ?string $cursor = null,
        public ?string $deviceSerial = null,
        public bool $skipped = false,
        public array $issueTypes = [],
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'records_fetched' => $this->recordsFetched,
            'records_stored' => $this->recordsStored,
            'issues' => $this->issues,
            'cursor' => $this->cursor,
            'device_serial' => $this->deviceSerial,
            'skipped' => $this->skipped,
            'issue_types' => $this->issueTypes,
        ];
    }
}
