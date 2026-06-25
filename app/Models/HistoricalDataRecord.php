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
        'period',
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

    public function resolvedPeriod(): ?string
    {
        return self::resolvePeriodValue($this->period, $this->quarter);
    }

    public function normalizedEvaluatedPerformanceScore(): ?float
    {
        return self::normalizeEvaluatedPerformanceScoreValue($this->evaluated_performance_score);
    }

    public static function resolvePeriodValue(?string $period, ?string $quarter): ?string
    {
        return self::resolveSemesterAlias($period)
            ?? self::resolveQuarterAlias($period)
            ?? self::resolveQuarterAlias($quarter);
    }

    public static function resolveQuarterValue(?string $quarter, ?string $period): ?string
    {
        $resolvedQuarter = self::canonicalQuarterAlias($quarter);

        if ($resolvedQuarter !== null) {
            return $resolvedQuarter;
        }

        return match (self::resolvePeriodValue($period, $quarter)) {
            'S1' => 'Q1',
            'S2' => 'Q3',
            default => null,
        };
    }

    public static function normalizeEvaluatedPerformanceScoreValue(float|int|string|null $score): ?float
    {
        if ($score === null || $score === '') {
            return null;
        }

        $numericScore = (float) $score;

        return $numericScore > 5
            ? round($numericScore / 20, 2)
            : $numericScore;
    }

    private static function resolveSemesterAlias(?string $value): ?string
    {
        [$normalizedValue, $condensedValue] = self::normalizedTimePeriodTokens($value);

        if ($normalizedValue === '') {
            return null;
        }

        if (
            in_array($condensedValue, ['S1', 'SEMESTER1', '1STSEMESTER', 'FIRSTSEMESTER'], true) ||
            preg_match('/\bSEMESTER\s*1\b/', $normalizedValue) === 1 ||
            str_contains($normalizedValue, 'JAN') ||
            str_contains($normalizedValue, 'JUNE')
        ) {
            return 'S1';
        }

        if (
            in_array($condensedValue, ['S2', 'SEMESTER2', '2NDSEMESTER', 'SECONDSEMESTER'], true) ||
            preg_match('/\bSEMESTER\s*2\b/', $normalizedValue) === 1 ||
            str_contains($normalizedValue, 'JUL') ||
            str_contains($normalizedValue, 'DEC')
        ) {
            return 'S2';
        }

        return null;
    }

    private static function resolveQuarterAlias(?string $value): ?string
    {
        return match (self::canonicalQuarterAlias($value)) {
            'Q1', 'Q2' => 'S1',
            'Q3', 'Q4' => 'S2',
            default => null,
        };
    }

    private static function canonicalQuarterAlias(?string $value): ?string
    {
        [$normalizedValue, $condensedValue] = self::normalizedTimePeriodTokens($value);

        if ($normalizedValue === '') {
            return null;
        }

        return match (true) {
            in_array($condensedValue, ['Q1', '1', 'QUARTER1', '1STQUARTER', 'FIRSTQUARTER'], true) => 'Q1',
            in_array($condensedValue, ['Q2', '2', 'QUARTER2', '2NDQUARTER', 'SECONDQUARTER'], true) => 'Q2',
            in_array($condensedValue, ['Q3', '3', 'QUARTER3', '3RDQUARTER', 'THIRDQUARTER'], true) => 'Q3',
            in_array($condensedValue, ['Q4', '4', 'QUARTER4', '4THQUARTER', 'FOURTHQUARTER'], true) => 'Q4',
            default => null,
        };
    }

    /**
     * @return array{0: string, 1: string}
     */
    private static function normalizedTimePeriodTokens(?string $value): array
    {
        $normalizedValue = strtoupper(trim((string) $value));
        $normalizedValue = trim((string) preg_replace('/[^A-Z0-9]+/', ' ', $normalizedValue));

        return [
            $normalizedValue,
            str_replace(' ', '', $normalizedValue),
        ];
    }
}
