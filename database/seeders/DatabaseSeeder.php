<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DepartmentSeeder::class,
            EmployeePositionSeeder::class,
            EmployeeSeeder::class,
            UserSeeder::class,
            IpcrWorkflowSeeder::class,
            LeaveWorkflowSeeder::class,
            PerformanceForecast2029Seeder::class,
        ]);
    }
}
