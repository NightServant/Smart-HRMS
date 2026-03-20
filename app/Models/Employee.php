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
        'supervisor_id',
    ];

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

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'employee_id', 'employee_id');
    }
}
