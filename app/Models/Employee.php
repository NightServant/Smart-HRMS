<?php

namespace App\Models;

use Carbon\Carbon;
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
        'department_id',
        'position_id',
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
            'manual_punch_enabled' => 'boolean',
            'date_hired' => 'date',
        ];
    }

    public static function nextEmployeeId(string $prefix = 'EMP', bool $lockForUpdate = false): string
    {
        $query = self::query()
            ->where('employee_id', 'like', $prefix.'-%')
            ->orderByDesc('employee_id');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $latestEmployeeId = $query->value('employee_id');

        preg_match('/(\d+)$/', (string) $latestEmployeeId, $matches);

        $nextNumber = ((int) ($matches[1] ?? 0)) + 1;

        return $prefix.'-'.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Map a linked account role to the employee-ID prefix.
     */
    public static function idPrefixForRole(?string $role): string
    {
        return match ($role) {
            User::ROLE_HR_PERSONNEL => 'HR',
            User::ROLE_PMT => 'PMT',
            default => 'EMP',
        };
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(EmployeePosition::class, 'position_id');
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

    /**
     * Reconcile manual_punch_enabled with the scheduled date range.
     *
     * - When today is within [start_date, end_date], the flag is set to true.
     * - When the end date has passed, the flag is cleared and the schedule wiped.
     * - When today is before the start date, the flag stays false (schedule pending).
     */
    public function refreshManualPunchStatus(): self
    {
        $startDate = $this->manual_punch_start_date !== null
            ? Carbon::parse($this->manual_punch_start_date)->startOfDay()
            : null;
        $endDate = $this->manual_punch_end_date !== null
            ? Carbon::parse($this->manual_punch_end_date)->endOfDay()
            : null;

        if ($startDate === null && $endDate === null && ! $this->manual_punch_enabled) {
            return $this;
        }

        $now = Carbon::now();

        if ($endDate !== null && $now->greaterThan($endDate)) {
            $this->update([
                'manual_punch_enabled' => false,
                'manual_punch_reason' => null,
                'manual_punch_start_date' => null,
                'manual_punch_end_date' => null,
            ]);

            return $this;
        }

        $shouldBeEnabled = $startDate !== null
            && $endDate !== null
            && $now->betweenIncluded($startDate, $endDate);

        if ((bool) $this->manual_punch_enabled !== $shouldBeEnabled) {
            $this->update(['manual_punch_enabled' => $shouldBeEnabled]);
        }

        return $this;
    }
}
