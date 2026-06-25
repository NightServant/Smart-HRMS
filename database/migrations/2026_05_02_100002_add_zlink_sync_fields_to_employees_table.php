<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->timestamp('zlink_synced_at')->nullable()->after('zkteco_pin');
            $table->string('zlink_sync_status', 20)->nullable()->after('zlink_synced_at');
            $table->text('zlink_sync_error')->nullable()->after('zlink_sync_status');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn(['zlink_synced_at', 'zlink_sync_status', 'zlink_sync_error']);
        });
    }
};
