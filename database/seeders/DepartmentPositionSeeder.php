<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentPositionSeeder extends Seeder
{
    /**
     * Seed the department_position pivot so that the position filter
     * dropdowns on the employee directory and related pages have content.
     */
    public function run(): void
    {
        $adminOfficeId = DB::table('departments')->where('name', 'Administrative Office')->value('id');
        $hrmoId = DB::table('departments')->where('name', 'Human Resource Management Office')->value('id');
        $positionIds = DB::table('employee_positions')->pluck('id', 'name');

        $now = now();
        $rows = [];

        $appendRow = function (?int $departmentId, string $positionName, string $linkedRole) use ($positionIds, $now, &$rows): void {
            if (! $departmentId || ! isset($positionIds[$positionName])) {
                return;
            }

            $rows[] = [
                'department_id' => $departmentId,
                'position_id' => $positionIds[$positionName],
                'linked_role' => $linkedRole,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        };

        foreach ([
            'Department Head' => 'evaluator',
            'Administrative Officer II' => 'employee',
            'Administrative Aide I' => 'employee',
            'Administrative Aide II' => 'employee',
            'Administrative Aide' => 'employee',
            'Administrative Assistant' => 'employee',
            'Analyst' => 'employee',
            'Supervisor' => 'employee',
            'Field Officer' => 'employee',
            'Representative' => 'employee',
            'QA' => 'employee',
        ] as $name => $role) {
            $appendRow($adminOfficeId, $name, $role);
        }

        foreach ([
            'Department Head' => 'hr-personnel',
            'HR Officer' => 'hr-personnel',
            'PMT Officer' => 'pmt',
            'PMT Chair' => 'pmt',
            'Representative' => 'employee',
        ] as $name => $role) {
            $appendRow($hrmoId, $name, $role);
        }

        if (empty($rows)) {
            return;
        }

        DB::table('department_position')->upsert(
            $rows,
            ['department_id', 'position_id'],
            ['linked_role', 'updated_at'],
        );
    }
}
