<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class EmployeePositionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        collect([
            'Department Head',
            'Administrative Officer II',
            'Administrative Aide I',
            'Administrative Aide II',
            'Administrative Aide',
            'Administrative Assistant',
            'Analyst',
            'Supervisor',
            'Field Officer',
            'HR Officer',
            'PMT Chair',
            'Representative',
            'QA',
        ])->each(fn (string $name) => \App\Models\EmployeePosition::query()->firstOrCreate([
            'name' => $name,
        ]));
    }
}
