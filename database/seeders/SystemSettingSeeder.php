<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key' => 'office_hours_start',
                'value' => '08:00',
                'type' => 'time',
                'group' => 'attendance',
                'label' => 'Office Hours Start',
                'description' => 'The official start time for the work day.',
            ],
            [
                'key' => 'office_hours_end',
                'value' => '17:00',
                'type' => 'time',
                'group' => 'attendance',
                'label' => 'Office Hours End',
                'description' => 'The official end time for the work day.',
            ],
            [
                'key' => 'late_threshold_minutes',
                'value' => '15',
                'type' => 'integer',
                'group' => 'attendance',
                'label' => 'Late Threshold (minutes)',
                'description' => 'Number of minutes after office start before an employee is marked late.',
            ],
            [
                'key' => 'maintenance_mode',
                'value' => 'false',
                'type' => 'boolean',
                'group' => 'system',
                'label' => 'Maintenance Mode',
                'description' => 'When enabled, non-admin users will see a maintenance notice.',
            ],
            [
                'key' => 'maintenance_message',
                'value' => null,
                'type' => 'string',
                'group' => 'system',
                'label' => 'Maintenance Message',
                'description' => 'Custom message displayed to users when maintenance mode is active.',
            ],
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
            SystemSetting::query()->updateOrCreate(
                ['key' => $setting['key']],
                $setting,
            );
        }
    }
}
