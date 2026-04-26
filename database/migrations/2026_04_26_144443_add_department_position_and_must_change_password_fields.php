<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('job_title')->constrained()->nullOnDelete();
            $table->foreignId('position_id')->nullable()->after('department_id')->constrained('employee_positions')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false)->after('is_active');
        });

        $defaultDepartmentId = DB::table('departments')->insertGetId([
            'name' => 'Administrative Office',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $positionMap = DB::table('employees')
            ->whereNotNull('job_title')
            ->where('job_title', '!=', '')
            ->distinct()
            ->orderBy('job_title')
            ->pluck('job_title')
            ->mapWithKeys(function ($jobTitle): array {
                $positionId = DB::table('employee_positions')->insertGetId([
                    'name' => $jobTitle,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return [$jobTitle => $positionId];
            });

        DB::table('employees')
            ->orderBy('employee_id')
            ->get(['employee_id', 'job_title'])
            ->each(function (object $employee) use ($defaultDepartmentId, $positionMap): void {
                DB::table('employees')
                    ->where('employee_id', $employee->employee_id)
                    ->update([
                        'department_id' => $defaultDepartmentId,
                        'position_id' => $positionMap[$employee->job_title] ?? null,
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('position_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('must_change_password');
        });
    }
};
