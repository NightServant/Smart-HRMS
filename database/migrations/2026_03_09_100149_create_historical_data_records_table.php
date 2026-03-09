<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('historical_data_records', function (Blueprint $table) {
            $table->id();
            $table->string('employee_name');
            $table->string('department_name');
            $table->unsignedSmallInteger('year');
            $table->string('quarter');
            $table->string('attendance_punctuality_rate');
            $table->unsignedInteger('absenteeism_days')->default(0);
            $table->unsignedInteger('tardiness_incidents')->default(0);
            $table->unsignedInteger('training_completion_status')->default(0);
            $table->decimal('evaluated_performance_score', 5, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historical_data_records');
    }
};
