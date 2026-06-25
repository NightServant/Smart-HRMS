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
        'zlink_employee_id',
        'webauthn_credential_id',
        'webauthn_public_key',
        'webauthn_sign_count',
        'webauthn_user_handle',
        'webauthn_enrolled_at',
        'manual_punch_enabled',
        'manual_punch_reason',
        'manual_punch_start_date',
        'manual_punch_end_date',
        'date_hired',
        'zlink_synced_at',
        'zlink_sync_status',
        'zlink_sync_error',
        'fingerprint_enrolled_at',
        'fingerprint_finger_index',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'manual_punch_enabled' => 'boolean',
            'webauthn_sign_count' => 'integer',
            'webauthn_enrolled_at' => 'datetime',
            'date_hired' => 'date',
            'zlink_synced_at' => 'datetime',
            'fingerprint_enrolled_at' => 'datetime',
            'fingerprint_finger_index' => 'integer',
        ];
    }

    /**
     * Whether this employee has a fingerprint registered at the terminal.
     * Persisted by EnrollmentService::verificationStatus once Zlink confirms
     * a credential exists, so the badge survives logout / new sessions
     * without forcing every page load to round-trip Zlink.
     */
    public function hasFingerprintEnrollment(): bool
    {
        return $this->fingerprint_enrolled_at !== null;
    }

    /**
     * Human-readable label for the persisted finger index, using the
     * standard ZKTeco mapping (0–4 right hand thumb→pinky, 5–9 left).
     * Returns null when no finger has been recorded yet.
     */
    public function fingerprintLabel(): ?string
    {
        $index = $this->fingerprint_finger_index;

        if ($index === null) {
            return null;
        }

        // ZK SDK / pyzk convention — must match EnrollmentService::fingerLabelFor().
        return match ($index) {
            0 => 'Left Pinky',
            1 => 'Left Ring',
            2 => 'Left Middle',
            3 => 'Left Index',
            4 => 'Left Thumb',
            5 => 'Right Thumb',
            6 => 'Right Index',
            7 => 'Right Middle',
            8 => 'Right Ring',
            9 => 'Right Pinky',
            default => 'Finger #'.$index,
        };
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
     * Whether this employee has any biometric attendance activity. This is
     * the canonical signal that the user is actually enrolled at a terminal,
     * since Zlink push-back only happens after a successful punch.
     */
    public function hasBiometricActivity(): bool
    {
        return AttendanceRecord::query()
            ->where('employee_id', $this->employee_id)
            ->where('source', 'biometric')
            ->exists();
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
