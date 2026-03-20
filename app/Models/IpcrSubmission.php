<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpcrSubmission extends Model
{
    protected $fillable = [
        'employee_id',
        'performance_rating',
        'is_first_submission',
        'evaluator_gave_remarks',
        'status',
        'stage',
        'routing_action',
        'evaluator_id',
        'confidence_pct',
        'notification',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'is_first_submission' => 'boolean',
            'evaluator_gave_remarks' => 'boolean',
            'performance_rating' => 'decimal:2',
            'confidence_pct' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'evaluator_id', 'employee_id');
    }
}
