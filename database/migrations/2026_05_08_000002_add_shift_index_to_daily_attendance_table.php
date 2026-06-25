<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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

        // Add the new composite unique BEFORE dropping the old one. The FK on
        // employee_id is supported by the leftmost prefix of (employee_id, date),
        // so dropping the old index in the same ALTER would leave the FK
        // temporarily unsupported (MySQL error 1553). Two separate ALTER
        // statements let InnoDB rebind the FK to the new index.
        if (! Schema::hasIndex('daily_attendance', 'daily_attendance_employee_id_date_shift_index_unique')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->unique(['employee_id', 'date', 'shift_index']);
            });
        }

        if (Schema::hasIndex('daily_attendance', 'daily_attendance_employee_id_date_unique')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->dropUnique(['employee_id', 'date']);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasIndex('daily_attendance', 'daily_attendance_employee_id_date_unique')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->unique(['employee_id', 'date']);
            });
        }

        if (Schema::hasIndex('daily_attendance', 'daily_attendance_employee_id_date_shift_index_unique')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->dropUnique(['employee_id', 'date', 'shift_index']);
            });
        }

        if (Schema::hasColumn('daily_attendance', 'shift_index')) {
            Schema::table('daily_attendance', function (Blueprint $table) {
                $table->dropColumn('shift_index');
            });
        }
    }
};
