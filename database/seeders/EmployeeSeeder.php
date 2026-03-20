<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['employee_id' => 'EMP-001', 'name' => 'John Reyes', 'job_title' => 'Department Head', 'supervisor_id' => null],
            ['employee_id' => 'EMP-002', 'name' => 'Maria Santos', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-003', 'name' => 'Mark Bautista', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-004', 'name' => 'Angela Cruz', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-005', 'name' => 'Patricia Garcia', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-006', 'name' => 'Kevin Mendoza', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-007', 'name' => 'Lorraine Flores', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-008', 'name' => 'Daniel Ramos', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-009', 'name' => 'Camille Navarro', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-010', 'name' => 'Joshua Aquino', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-011', 'name' => 'Ana Dela Cruz', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-012', 'name' => 'Ramon Villanueva', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-013', 'name' => 'Josephine Pascual', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-014', 'name' => 'Michael Torres', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-015', 'name' => 'Liza Castillo', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-016', 'name' => 'Roberto Jimenez', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-017', 'name' => 'Christine Morales', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-018', 'name' => 'Ferdinand Aguilar', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-019', 'name' => 'Maricel Dela Rosa', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-020', 'name' => 'Benedict Mercado', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
            ['employee_id' => 'EMP-021', 'name' => 'Theresa Evangelista', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001'],
        ];

        // Insert department head first (no FK dependency), then the rest
        DB::table('employees')->insert($employees[0]);
        DB::table('employees')->insert(array_slice($employees, 1));
    }
}
