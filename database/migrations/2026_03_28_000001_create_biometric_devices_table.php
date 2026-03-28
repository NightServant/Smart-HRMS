<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_devices', function (Blueprint $table): void {
            $table->id();
            $table->string('serial_number', 50)->unique();
            $table->string('name', 100)->nullable();
            $table->dateTime('last_activity_at')->nullable();
            $table->string('last_sync_stamp', 50)->nullable();
            $table->unsignedInteger('records_synced')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_devices');
    }
};
