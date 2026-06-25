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
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->string('employee_id', 50)->nullable()->after('id');
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('
                UPDATE attendance_records
                SET employee_id = (
                    SELECT employee_id
                    FROM employees
                    WHERE employees.name = attendance_records.name
                    LIMIT 1
                )
                WHERE employee_id IS NULL
            ');
        } else {
            DB::statement('
                UPDATE attendance_records ar
                JOIN employees e ON ar.name = e.name
                SET ar.employee_id = e.employee_id
            ');
        }

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->string('employee_id', 50)->nullable(false)->change();
            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees')
                ->onDelete('cascade');
            $table->dropColumn('clock_in', 'clock_out');
            $table->dateTime('punch_time')->after('date');
            $table->dropColumn('name');
            $table->unique(['employee_id', 'punch_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropUnique(['employee_id', 'punch_time']);
            $table->dropColumn('employee_id', 'punch_time');
            $table->string('name')->after('id');
            $table->string('clock_in')->nullable()->after('date');
            $table->string('clock_out')->nullable()->after('clock_in');
        });
    }
};
