<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('system_settings')
            ->where('key', 'ipcr_period_year')
            ->update(['type' => 'string']);
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', 'ipcr_period_year')
            ->update(['type' => 'integer']);
    }
};
