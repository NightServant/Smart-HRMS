<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $timestamp = now();

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'ipcr_target_opened_at'],
            [
                'value' => null,
                'type' => 'string',
                'group' => 'ipcr',
                'label' => 'IPCR Target Window Opened At',
                'description' => 'ISO timestamp when HR last opened the target submission window. Used to enforce the 15-day deadline.',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        );
    }

    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', 'ipcr_target_opened_at')
            ->delete();
    }
};
