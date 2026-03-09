<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistoricalDataRecord extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'employee_name',
        'department_name',
        'year',
        'quarter',
        'attendance_punctuality_rate',
        'absenteeism_days',
        'tardiness_incidents',
        'training_completion_status',
        'evaluated_performance_score',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'absenteeism_days' => 'integer',
            'tardiness_incidents' => 'integer',
            'training_completion_status' => 'integer',
            'evaluated_performance_score' => 'decimal:2',
        ];
    }
}
