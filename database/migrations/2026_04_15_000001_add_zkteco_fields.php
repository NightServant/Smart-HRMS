<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->unsignedInteger('zkteco_pin')->nullable()->unique()->after('employee_id');
        });

        Schema::table('biometric_devices', function (Blueprint $table): void {
            $table->string('api_key', 64)->nullable()->unique()->after('serial_number');
            $table->string('ip_address', 45)->nullable()->after('api_key');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropUnique(['zkteco_pin']);
            $table->dropColumn('zkteco_pin');
        });

        Schema::table('biometric_devices', function (Blueprint $table): void {
            $table->dropUnique(['api_key']);
            $table->dropColumn(['api_key', 'ip_address']);
        });
    }
};
