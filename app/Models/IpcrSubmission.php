<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class IpcrSubmission extends Model
{
    protected $fillable = [
        'employee_id',
        'performance_rating',
        'criteria_ratings',
        'form_payload',
        'is_first_submission',
        'evaluator_gave_remarks',
        'status',
        'stage',
        'routing_action',
        'evaluator_id',
        'confidence_pct',
        'notification',
        'rejection_reason',
        'evaluator_pass_fail',

        // Phase 3 — HR Checking
        'hr_reviewer_id',
        'hr_decision',
        'hr_remarks',
        'hr_cycle_count',

        // Phase 3B — Appeal
        'appeal_status',
        'appeal_window_opens_at',
        'appeal_window_closes_at',
        'appeal_count',

        // Phase 4 — PMT Validation
        'pmt_reviewer_id',
        'pmt_decision',
        'pmt_remarks',
        'pmt_cycle_count',

        // Phase 5 — Finalization
        'finalized_at',
        'final_rating',
        'adjectival_rating',

        // Escalation
        'is_escalated',
        'escalation_reason',
    ];

    protected function casts(): array
    {
        return [
            'is_first_submission' => 'boolean',
            'evaluator_gave_remarks' => 'boolean',
            'performance_rating' => 'decimal:2',
            'criteria_ratings' => 'array',
            'form_payload' => 'array',
            'confidence_pct' => 'decimal:2',
            'hr_cycle_count' => 'integer',
            'pmt_cycle_count' => 'integer',
            'appeal_window_opens_at' => 'datetime',
            'appeal_window_closes_at' => 'datetime',
            'appeal_count' => 'integer',
            'finalized_at' => 'datetime',
            'final_rating' => 'decimal:2',
            'is_escalated' => 'boolean',
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

    public function hrReviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'hr_reviewer_id', 'employee_id');
    }

    public function pmtReviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'pmt_reviewer_id', 'employee_id');
    }

    public function appeal(): HasOne
    {
        return $this->hasOne(IpcrAppeal::class);
    }

    public function hasAppealSubmission(): bool
    {
        if (in_array($this->appeal_status, ['appealed', 'submitted'], true)) {
            return true;
        }

        return $this->appeal !== null;
    }

    public function normalizedAppealStatus(): ?string
    {
        if ($this->appeal_status === 'appeal_window_open' || $this->stage === 'appeal_window_open') {
            return 'appeal_window_open';
        }

        if ($this->hasAppealSubmission()) {
            return 'appealed';
        }

        if ($this->appeal_status === 'no_appeal') {
            return 'no_appeal';
        }

        return $this->appeal_status;
    }

    /**
     * Check if the appeal window is currently open and not expired.
     */
    public function isAppealWindowOpen(): bool
    {
        return ($this->appeal_status === 'appeal_window_open' || $this->stage === 'appeal_window_open')
            && $this->appeal_window_closes_at !== null
            && now()->lt($this->appeal_window_closes_at);
    }
}
