<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $hrmoId = DB::table('departments')
            ->where('name', 'Human Resource Management Office')
            ->value('id');

        if (! $hrmoId) {
            return;
        }

        $departmentHeadId = DB::table('employee_positions')->where('name', 'Department Head')->value('id');
        $pmtOfficerId = DB::table('employee_positions')->where('name', 'PMT Officer')->value('id');

        // Grace Tan: HR Personnel user → ensure employee record + HR-001.
        $graceUser = DB::table('users')->where('email', 'grace.tan@shrms.test')->first();
        if ($graceUser) {
            $existingGraceEmployee = DB::table('employees')->where('employee_id', 'HR-001')->first();
            if (! $existingGraceEmployee) {
                DB::table('employees')->insert([
                    'employee_id' => 'HR-001',
                    'name' => $graceUser->name,
                    'job_title' => 'Department Head',
                    'position_id' => $departmentHeadId,
                    'department_id' => $hrmoId,
                    'supervisor_id' => null,
                    'date_hired' => '2024-01-15',
                ]);
            }

            DB::table('users')->where('id', $graceUser->id)->update([
                'employee_id' => 'HR-001',
                'updated_at' => now(),
            ]);
        }

        // Mark Reyes: align to PMT Officer in HRMO.
        DB::table('employees')->where('employee_id', 'PMT-001')->update([
            'job_title' => 'PMT Officer',
            'position_id' => $pmtOfficerId,
            'department_id' => $hrmoId,
            'supervisor_id' => 'HR-001',
        ]);
    }

    public function down(): void
    {
        $representativeId = DB::table('employee_positions')->where('name', 'Representative')->value('id');

        DB::table('employees')->where('employee_id', 'PMT-001')->update([
            'job_title' => 'Representative',
            'position_id' => $representativeId,
            'supervisor_id' => null,
        ]);

        DB::table('employees')->where('employee_id', 'HR-001')->delete();

        DB::table('users')->where('email', 'grace.tan@shrms.test')->update([
            'employee_id' => null,
            'updated_at' => now(),
        ]);
    }
};
