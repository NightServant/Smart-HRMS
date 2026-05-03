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
            LeaveWorkflowSeeder::class,
            HistoricalPerformanceSeeder::class,
            IpcrWorkflowSeeder::class,
            IpcrApprovedTargetsSeeder::class,
        ]);
    }
}
