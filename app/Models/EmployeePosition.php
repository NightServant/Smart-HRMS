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

    public function linkedAccountRole(): string
    {
        return self::linkedAccountRoleForName($this->name);
    }

    public static function linkedAccountRoleForName(?string $positionName): string
    {
        $normalizedName = strtolower(trim((string) $positionName));

        return match ($normalizedName) {
            'department head' => User::ROLE_EVALUATOR,
            'representative',
            'pmt chair' => User::ROLE_PMT,
            'administrative officer ii',
            'administrative office ii',
            'administrative aide i' => User::ROLE_EMPLOYEE,
            default => User::ROLE_EMPLOYEE,
        };
    }

    public function employees(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Employee::class, 'position_id');
    }
}
