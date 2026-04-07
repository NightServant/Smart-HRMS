<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpcrTarget extends Model
{
    protected $fillable = [
        'employee_id',
        'semester',
        'target_year',
        'form_payload',
        'status',
        'submitted_at',
        'evaluator_id',
        'evaluator_decision',
        'evaluator_remarks',
        'evaluator_reviewed_at',
        'hr_finalized',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'target_year' => 'integer',
            'form_payload' => 'array',
            'submitted_at' => 'datetime',
            'evaluator_reviewed_at' => 'datetime',
            'hr_finalized' => 'boolean',
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

    /**
     * Scope to the latest target for a given semester and year.
     */
    public function scopeForPeriod(Builder $query, int $semester, int $targetYear): Builder
    {
        return $query->where('semester', $semester)
            ->where('target_year', $targetYear);
    }
}
