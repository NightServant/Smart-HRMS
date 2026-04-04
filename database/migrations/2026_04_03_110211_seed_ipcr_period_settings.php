<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $timestamp = now();

        $settings = [
            [
                'key' => 'ipcr_period_open',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'ipcr',
                'label' => 'IPCR Period Open',
                'description' => 'Controls whether employees can start a new IPCR submission.',
            ],
            [
                'key' => 'ipcr_period_label',
                'value' => 'January to June 2026',
                'type' => 'string',
                'group' => 'ipcr',
                'label' => 'IPCR Period Label',
                'description' => 'Human-readable evaluation period shown on the IPCR pages.',
            ],
            [
                'key' => 'ipcr_period_year',
                'value' => '2026',
                'type' => 'integer',
                'group' => 'ipcr',
                'label' => 'IPCR Period Year',
                'description' => 'Reference year for the active IPCR period.',
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $setting['key']],
                [...$setting, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            );
        }
    }

    public function down(): void
    {
        DB::table('system_settings')->whereIn('key', [
            'ipcr_period_open',
            'ipcr_period_label',
            'ipcr_period_year',
        ])->delete();
    }
};
