<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->unsignedSmallInteger('shift_index')->default(1)->after('date');
        });

        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->dropUnique(['employee_id', 'date']);
            $table->unique(['employee_id', 'date', 'shift_index']);
        });
    }

    public function down(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->dropUnique(['employee_id', 'date', 'shift_index']);
            $table->unique(['employee_id', 'date']);
        });

        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->dropColumn('shift_index');
        });
    }
};
