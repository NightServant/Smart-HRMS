<?php

namespace App\Support;

/**
 * Allowlist of position names permitted within specific departments.
 *
 * Departments not present here are unrestricted (any position from
 * the department_position pivot may be assigned). Position names are
 * compared case-insensitively, with whitespace collapsed and common
 * Roman/Arabic suffix variants treated as equivalent
 * ("Administrative Officer II" ≡ "Administrative Officer 2").
 */
class DepartmentPositionPolicy
{
    public const ADMIN_OFFICE = 'Administrative Office';

    public const HRMO = 'Human Resource Management Office';

    /**
     * @var array<string, list<string>>
     */
    private const ALLOWED = [
        self::ADMIN_OFFICE => [
            'Department Head',
            'Administrative Officer II',
            'Administrative Aide I',
        ],
        self::HRMO => [
            'Department Head',
            'PMT Officer',
        ],
    ];

    /**
     * @return list<string>
     */
    public static function allowedPositionsFor(?string $departmentName): array
    {
        $key = self::canonicalDepartment($departmentName);

        return self::ALLOWED[$key] ?? [];
    }

    public static function isRestricted(?string $departmentName): bool
    {
        return self::allowedPositionsFor($departmentName) !== [];
    }

    public static function isAllowed(?string $departmentName, ?string $positionName): bool
    {
        if (! self::isRestricted($departmentName)) {
            return true;
        }

        $allowed = array_map(
            [self::class, 'normalizePosition'],
            self::allowedPositionsFor($departmentName),
        );

        return in_array(self::normalizePosition((string) $positionName), $allowed, true);
    }

    private static function canonicalDepartment(?string $name): string
    {
        $trimmed = trim((string) $name);
        $normalized = strtolower((string) preg_replace('/\s+/', ' ', $trimmed));

        return match ($normalized) {
            'administrative office', 'admin office' => self::ADMIN_OFFICE,
            'human resource management office', 'hrmo' => self::HRMO,
            default => $trimmed,
        };
    }

    private static function normalizePosition(string $name): string
    {
        $collapsed = strtolower((string) preg_replace('/\s+/', ' ', trim($name)));

        $romanMap = [
            ' i' => ' 1',
            ' ii' => ' 2',
            ' iii' => ' 3',
            ' iv' => ' 4',
            ' v' => ' 5',
        ];

        return strtr($collapsed, $romanMap);
    }
}
