<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    public const ROLE_ADMINISTRATOR = 'administrator';

    public const ROLE_EMPLOYEE = 'employee';

    public const ROLE_EVALUATOR = 'evaluator';

    public const ROLE_HR_PERSONNEL = 'hr-personnel';

    public const ROLE_PMT = 'pmt';

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'password',
        'role',
        'employee_id',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function roles(): array
    {
        return [
            self::ROLE_ADMINISTRATOR,
            self::ROLE_EMPLOYEE,
            self::ROLE_EVALUATOR,
            self::ROLE_HR_PERSONNEL,
            self::ROLE_PMT,
        ];
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function isAdministrator(): bool
    {
        return $this->role === self::ROLE_ADMINISTRATOR;
    }

    public function homeRouteName(): string
    {
        if ($this->role === self::ROLE_ADMINISTRATOR) {
            return 'admin.system-dashboard';
        }

        if ($this->role === self::ROLE_HR_PERSONNEL) {
            return 'admin.performance-dashboard';
        }

        if ($this->role === self::ROLE_EVALUATOR) {
            return 'performanceDashboard';
        }

        if ($this->role === self::ROLE_PMT) {
            return 'admin.pmt-review';
        }

        return 'dashboard';
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'employee_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
