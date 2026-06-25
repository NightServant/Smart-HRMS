<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->string('zlink_department_id', 64)->nullable()->unique()->after('name');
            $table->timestamp('zlink_synced_at')->nullable()->after('zlink_department_id');
            $table->string('zlink_sync_status', 20)->nullable()->after('zlink_synced_at');
            $table->text('zlink_sync_error')->nullable()->after('zlink_sync_status');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->dropColumn([
                'zlink_department_id',
                'zlink_synced_at',
                'zlink_sync_status',
                'zlink_sync_error',
            ]);
        });
    }
};
