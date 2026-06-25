<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->string('employee_id', 20)->primary();
            $table->string('name', 100);
            $table->string('job_title', 100);
            $table->string('supervisor_id', 20)->nullable();

            $table->foreign('supervisor_id')
                ->references('employee_id')
                ->on('employees');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
