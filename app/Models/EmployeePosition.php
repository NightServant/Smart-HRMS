<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

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
     * Resolve the linked account role for a (department, position) pair.
     *
     * Looks up the department_position pivot first; falls back to legacy
     * position-name heuristics so callers without a department still resolve
     * to a sensible role.
     */
    public static function linkedAccountRoleFor(?string $departmentName, ?string $positionName): string
    {
        $deptName = trim((string) $departmentName);
        $posName = trim((string) $positionName);

        if ($deptName !== '' && $posName !== '') {
            $role = DB::table('department_position')
                ->join('departments', 'departments.id', '=', 'department_position.department_id')
                ->join('employee_positions', 'employee_positions.id', '=', 'department_position.position_id')
                ->where('departments.name', $deptName)
                ->where('employee_positions.name', $posName)
                ->value('department_position.linked_role');

            if (is_string($role) && $role !== '') {
                return $role;
            }
        }

        $normalizedPos = strtolower($posName);

        return match ($normalizedPos) {
            'department head' => User::ROLE_EVALUATOR,
            'pmt officer', 'pmt chair', 'representative' => User::ROLE_PMT,
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

    public function departments(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            Department::class,
            'department_position',
            'position_id',
            'department_id',
        )
            ->withPivot('linked_role')
            ->withTimestamps();
    }
}
