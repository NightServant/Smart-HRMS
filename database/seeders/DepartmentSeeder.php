<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Department::query()->firstOrCreate([
            'name' => 'Administrative Office',
        ]);

        \App\Models\Department::query()->firstOrCreate([
            'name' => 'Performance Management Team',
        ]);
    }
}
