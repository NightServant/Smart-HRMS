<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipcr_appeals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ipcr_submission_id')->constrained('ipcr_submissions')->cascadeOnDelete();
            $table->string('employee_id', 20);
            $table->text('appeal_reason');
            $table->text('appeal_evidence_description')->nullable();
            $table->json('evidence_files')->nullable();
            $table->string('status', 20)->default('submitted');
            $table->text('pmt_response')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('employee_id')->on('employees');
            $table->unique('ipcr_submission_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_appeals');
    }
};
