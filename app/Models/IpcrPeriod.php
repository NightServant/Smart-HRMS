<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IpcrPeriod extends Model
{
    public const TYPE_TARGET = 'target';

    public const TYPE_EVALUATION = 'evaluation';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_BACKFILLED = 'backfilled';

    protected $fillable = [
        'type',
        'semester',
        'year',
        'status',
        'opened_at',
        'closed_at',
        'opened_by',
        'closed_by',
        'override_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'year' => 'integer',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function extensions(): HasMany
    {
        return $this->hasMany(IpcrPeriodExtension::class, 'period_id');
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeForPeriod(Builder $query, int $semester, int $year): Builder
    {
        return $query->where('semester', $semester)->where('year', $year);
    }
}
