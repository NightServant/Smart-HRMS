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
            // Add employee_id column (nullable initially for backfill)
            $table->string('employee_id', 50)->nullable()->after('id');
        });

        // Backfill employee_id by matching name with employees table
        DB::statement('
            UPDATE attendance_records ar
            JOIN employees e ON ar.name = e.name
            SET ar.employee_id = e.employee_id
        ');

        Schema::table('attendance_records', function (Blueprint $table) {
            // Make employee_id non-nullable after backfill
            $table->string('employee_id', 50)->nullable(false)->change();

            // Add foreign key constraint
            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees')
                ->onDelete('cascade');

            // Replace clock_in and clock_out with punch_time
            $table->dropColumn('clock_in', 'clock_out');
            $table->dateTime('punch_time')->after('date');

            // Drop name column (employee_id is now the FK)
            $table->dropColumn('name');

            // Add unique constraint: employee can have only one record per punch time
            $table->unique(['employee_id', 'punch_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            // Restore original structure
            $table->dropForeignKey(['employee_id']);
            $table->dropUnique(['employee_id', 'punch_time']);
            $table->dropColumn('employee_id', 'punch_time');

            // Restore old columns
            $table->string('name')->after('id');
            $table->string('clock_in')->nullable()->after('date');
            $table->string('clock_out')->nullable()->after('clock_in');
        });
    }
};
