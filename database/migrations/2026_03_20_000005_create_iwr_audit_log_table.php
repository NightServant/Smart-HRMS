<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iwr_audit_log', function (Blueprint $table) {
            $table->id();
            $table->timestamp('logged_at');
            $table->string('employee_id', 20);
            $table->string('document_type', 10); // 'ipcr' or 'leave'
            $table->unsignedBigInteger('document_id');
            $table->string('routing_action', 50)->nullable();
            $table->decimal('confidence_pct', 5, 2)->nullable();
            $table->boolean('compliance_passed');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iwr_audit_log');
    }
};
