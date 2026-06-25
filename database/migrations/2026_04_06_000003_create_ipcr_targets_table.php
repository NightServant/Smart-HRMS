<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipcr_targets', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 20);
            $table->unsignedTinyInteger('semester');
            $table->unsignedSmallInteger('target_year');
            $table->json('form_payload')->nullable();
            $table->string('status', 30)->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'semester', 'target_year']);

            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_targets');
    }
};
