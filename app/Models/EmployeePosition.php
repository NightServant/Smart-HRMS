<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeePosition extends Model
{
    /** @use HasFactory<\Database\Factories\EmployeePositionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
    ];

    public function linkedAccountRole(?string $departmentName = null): string
    {
        return self::linkedAccountRoleFor($departmentName, $this->name);
    }

    /**
     * Resolve the linked user role for a (department, position) pair.
     *
     * Department Head maps to different roles per department:
     *  - Administrative Office          → Evaluator
     *  - Human Resource Management Office → HR Personnel
     *  - Any other / new department     → Employee (safe fallback; adjust here as the org grows)
     */
    public static function linkedAccountRoleFor(?string $departmentName, ?string $positionName): string
    {
        $dept = strtolower(trim((string) $departmentName));
        $pos = strtolower(trim((string) $positionName));

        return match (true) {
            $dept === 'administrative office' && $pos === 'department head' => User::ROLE_EVALUATOR,
            $dept === 'human resource management office' && $pos === 'department head' => User::ROLE_HR_PERSONNEL,
            $dept === 'human resource management office' && $pos === 'pmt officer' => User::ROLE_PMT,
            $pos === 'pmt chair', $pos === 'pmt officer', $pos === 'representative' => User::ROLE_PMT,
            $pos === 'department head' => User::ROLE_EVALUATOR,
            default => User::ROLE_EMPLOYEE,
        };
    }

    public static function linkedAccountRoleForName(?string $positionName): string
    {
        return self::linkedAccountRoleFor(null, $positionName);
    }

    public function employees(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Employee::class, 'position_id');
    }
}
