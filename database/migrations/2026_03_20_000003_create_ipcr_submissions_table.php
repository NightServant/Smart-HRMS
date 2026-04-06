<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipcr_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 20);
            $table->decimal('performance_rating', 3, 2)->nullable();
            $table->boolean('is_first_submission')->default(true);
            $table->boolean('evaluator_gave_remarks')->default(false);

            // IWR response fields
            $table->string('status', 30)->nullable();
            $table->string('stage', 50)->nullable();
            $table->string('routing_action', 50)->nullable();
            $table->string('evaluator_id', 20)->nullable();
            $table->decimal('confidence_pct', 5, 2)->nullable();
            $table->text('notification')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_submissions');
    }
};
