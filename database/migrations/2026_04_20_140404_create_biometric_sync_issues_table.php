<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_sync_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('biometric_device_id')->nullable()->constrained()->nullOnDelete();
            $table->string('pin', 50)->nullable();
            $table->string('punch_time_raw', 100)->nullable();
            $table->string('issue_type', 50);
            $table->string('message');
            $table->dateTime('occurred_at');
            $table->timestamps();

            $table->index(['issue_type', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_sync_issues');
    }
};
