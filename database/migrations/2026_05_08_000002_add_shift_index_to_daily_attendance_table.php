<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('daily_attendance', 'shift_index')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->unsignedSmallInteger('shift_index')->default(1)->after('date');
            });
        }

        $indexes = collect(DB::select('SHOW INDEXES FROM daily_attendance'))
            ->pluck('Key_name')
            ->unique();

        Schema::table('daily_attendance', function (Blueprint $table) use ($indexes) {
            if ($indexes->contains('daily_attendance_employee_id_date_unique')) {
                $table->dropUnique(['employee_id', 'date']);
            }

            if (! $indexes->contains('daily_attendance_employee_id_date_shift_index_unique')) {
                $table->unique(['employee_id', 'date', 'shift_index']);
            }
        });
    }

    public function down(): void
    {
        $indexes = collect(DB::select('SHOW INDEXES FROM daily_attendance'))
            ->pluck('Key_name')
            ->unique();

        Schema::table('daily_attendance', function (Blueprint $table) use ($indexes) {
            if ($indexes->contains('daily_attendance_employee_id_date_shift_index_unique')) {
                $table->dropUnique(['employee_id', 'date', 'shift_index']);
            }

            if (! $indexes->contains('daily_attendance_employee_id_date_unique')) {
                $table->unique(['employee_id', 'date']);
            }
        });

        if (Schema::hasColumn('daily_attendance', 'shift_index')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->dropColumn('shift_index');
            });
        }
    }
};
