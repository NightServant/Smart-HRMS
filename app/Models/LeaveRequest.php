<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'employee_id',
        'leave_type',
        'start_date',
        'end_date',
        'reason',
        'days_requested',
        'status',
        'medical_certificate_path',
        'marriage_certificate_path',
        'solo_parent_id_path',
        'has_medical_certificate',
        'has_solo_parent_id',
        'has_marriage_certificate',
        'dh_decision',
        'hr_decision',
        'has_rejection_reason',
        'rejection_reason_text',
        'stage',
        'routing_action',
        'approver_id',
        'confidence_pct',
        'notification',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'has_medical_certificate' => 'boolean',
            'has_solo_parent_id' => 'boolean',
            'has_marriage_certificate' => 'boolean',
            'confidence_pct' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function leaveAccrual(): ?float
    {
        if ($this->days_requested === null) {
            return null;
        }

        return round(((float) $this->days_requested) / 12, 2);
    }
}
