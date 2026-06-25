<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $timestamp = now();

        // Seed the ipcr_target_open toggle so that SystemSetting::set() can
        // update it (which uses UPDATE, not INSERT).  The default value 'false'
        // is the "not yet opened" state — currentTargetSubmissionPeriod() will
        // still auto-open the window based on the calendar month (November/May)
        // when the value is 'false' (i.e. HR has not explicitly touched it).
        // Once HR explicitly opens via notifyIpcrTargetWindow the value becomes
        // 'true', and once they close it via closeIpcrTargetWindow it returns to
        // 'false' — but closeIpcrTargetWindow also writes ipcr_target_semester
        // and ipcr_target_year, which currentTargetSubmissionPeriod() reads to
        // determine the period for the "explicitly closed" state.
        $settings = [
            [
                'key' => 'ipcr_target_open',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'ipcr',
                'label' => 'IPCR Target Window Open',
                'description' => 'HR sets this to true to open the target submission window '
                    .'(November for Semester 1, May for Semester 2) and to false to close it early.',
            ],
            [
                'key' => 'ipcr_target_semester',
                'value' => '1',
                'type' => 'integer',
                'group' => 'ipcr',
                'label' => 'IPCR Target Semester',
                'description' => 'The semester (1 or 2) for which the target window is currently open.',
            ],
            [
                'key' => 'ipcr_target_year',
                'value' => (string) now()->year,
                'type' => 'integer',
                'group' => 'ipcr',
                'label' => 'IPCR Target Year',
                'description' => 'The calendar year for which the active target window applies.',
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
            'ipcr_target_open',
            'ipcr_target_semester',
            'ipcr_target_year',
        ])->delete();
    }
};
