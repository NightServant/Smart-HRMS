<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Employee extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = 'employee_id';

    protected $keyType = 'string';

    protected $fillable = [
        'employee_id',
        'name',
        'job_title',
        'employment_status',
        'supervisor_id',
        'zkteco_pin',
        'manual_punch_enabled',
        'manual_punch_reason',
        'manual_punch_start_date',
        'manual_punch_end_date',
        'date_hired',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'zkteco_pin' => 'integer',
            'manual_punch_enabled' => 'boolean',
            'date_hired' => 'date',
        ];
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id', 'employee_id');
    }

    public function subordinates(): HasMany
    {
        return $this->hasMany(Employee::class, 'supervisor_id', 'employee_id');
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'employee_id', 'employee_id');
    }

    public function ipcrSubmissions(): HasMany
    {
        return $this->hasMany(IpcrSubmission::class, 'employee_id', 'employee_id');
    }

    public function latestSubmission(): HasOne
    {
        return $this->hasOne(IpcrSubmission::class, 'employee_id', 'employee_id')->latestOfMany();
    }

    public function latestRatedSubmission(): HasOne
    {
        return $this->hasOne(IpcrSubmission::class, 'employee_id', 'employee_id')
            ->whereNotNull('performance_rating')
            ->latestOfMany();
    }

    public function ipcrTargets(): HasMany
    {
        return $this->hasMany(IpcrTarget::class, 'employee_id', 'employee_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'employee_id', 'employee_id');
    }
}
