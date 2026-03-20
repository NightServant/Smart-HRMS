<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IwrAuditLog extends Model
{
    protected $table = 'iwr_audit_log';

    protected $fillable = [
        'logged_at',
        'employee_id',
        'document_type',
        'document_id',
        'routing_action',
        'confidence_pct',
        'compliance_passed',
    ];

    protected function casts(): array
    {
        return [
            'logged_at' => 'datetime',
            'confidence_pct' => 'decimal:2',
            'compliance_passed' => 'boolean',
        ];
    }
}
