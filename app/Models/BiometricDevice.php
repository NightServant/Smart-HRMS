<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricDevice extends Model
{
    protected $fillable = [
        'serial_number',
        'name',
        'last_activity_at',
        'last_sync_stamp',
        'records_synced',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }
}
