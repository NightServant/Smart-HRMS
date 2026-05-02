<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ipcr_period_extensions', function (Blueprint $table) {
            $table->id();
            // The closed period this extension applies to. Cascading delete is
            // appropriate — extensions only have meaning while the parent
            // period exists.
            $table->unsignedBigInteger('period_id');
            // Which user is granted the late-submission window. Stored as the
            // employee_id string to align with `ipcr_targets`/`ipcr_submissions`.
            $table->string('employee_id', 20);
            $table->unsignedBigInteger('granted_by')->nullable();
            $table->text('reason');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->unsignedBigInteger('revoked_by')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'period_id']);
            $table->index(['period_id', 'revoked_at', 'expires_at']);

            $table->foreign('period_id')
                ->references('id')
                ->on('ipcr_periods')
                ->cascadeOnDelete();

            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees')
                ->cascadeOnDelete();

            $table->foreign('granted_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('revoked_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_period_extensions');
    }
};
