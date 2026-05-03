<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    /** @use HasFactory<\Database\Factories\DepartmentFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'zlink_department_id',
        'zlink_synced_at',
        'zlink_sync_status',
        'zlink_sync_error',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'zlink_synced_at' => 'datetime',
        ];
    }

    public function employees(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function positions(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            EmployeePosition::class,
            'department_position',
            'department_id',
            'position_id',
        )
            ->withPivot('linked_role')
            ->withTimestamps();
    }
}
