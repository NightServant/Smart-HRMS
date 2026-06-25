<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $timestamp = now();

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'ipcr_target_mode'],
            [
                'value' => 'auto',
                'type' => 'string',
                'group' => 'ipcr',
                'label' => 'IPCR Target Mode',
                'description' => 'Controls whether the IPCR target form follows the calendar automatically or is forced open/closed by HR.',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        );
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', 'ipcr_target_mode')
            ->delete();
    }
};
