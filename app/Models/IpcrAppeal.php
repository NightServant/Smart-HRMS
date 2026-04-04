<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpcrAppeal extends Model
{
    protected $fillable = [
        'ipcr_submission_id',
        'employee_id',
        'appeal_reason',
        'appeal_evidence_description',
        'evidence_files',
        'status',
        'pmt_response',
    ];

    protected function casts(): array
    {
        return [
            'evidence_files' => 'array',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(IpcrSubmission::class, 'ipcr_submission_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }
}
