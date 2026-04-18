<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['employee_id' => 'EMP-001', 'name' => 'John Reyes', 'job_title' => 'Department Head', 'supervisor_id' => null, 'date_hired' => '2015-03-01'],
            ['employee_id' => 'EMP-002', 'name' => 'Maria Santos', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001', 'date_hired' => '2018-01-15'],
            ['employee_id' => 'EMP-003', 'name' => 'Mark Bautista', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001', 'date_hired' => '2018-04-10'],
            ['employee_id' => 'EMP-004', 'name' => 'Angela Cruz', 'job_title' => 'Administrative Officer II', 'supervisor_id' => 'EMP-001', 'date_hired' => '2019-07-22'],
            ['employee_id' => 'EMP-005', 'name' => 'Patricia Garcia', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2019-09-05'],
            ['employee_id' => 'EMP-006', 'name' => 'Kevin Mendoza', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2020-01-13'],
            ['employee_id' => 'EMP-007', 'name' => 'Lorraine Flores', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2020-03-02'],
            ['employee_id' => 'EMP-008', 'name' => 'Daniel Ramos', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2020-08-17'],
            ['employee_id' => 'EMP-009', 'name' => 'Camille Navarro', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2021-02-28'],
            ['employee_id' => 'EMP-010', 'name' => 'Joshua Aquino', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2021-05-10'],
            ['employee_id' => 'EMP-011', 'name' => 'Ana Dela Cruz', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2021-09-14'],
            ['employee_id' => 'EMP-012', 'name' => 'Ramon Villanueva', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2022-01-03'],
            ['employee_id' => 'EMP-013', 'name' => 'Josephine Pascual', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2022-03-21'],
            ['employee_id' => 'EMP-014', 'name' => 'Michael Torres', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2022-07-04'],
            ['employee_id' => 'EMP-015', 'name' => 'Liza Castillo', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2022-10-18'],
            ['employee_id' => 'EMP-016', 'name' => 'Roberto Jimenez', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2023-02-06'],
            ['employee_id' => 'EMP-017', 'name' => 'Christine Morales', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2023-05-29'],
            ['employee_id' => 'EMP-018', 'name' => 'Ferdinand Aguilar', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2023-08-11'],
            ['employee_id' => 'EMP-019', 'name' => 'Maricel Dela Rosa', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2024-01-07'],
            ['employee_id' => 'EMP-020', 'name' => 'Benedict Mercado', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2020-06-01'],
            ['employee_id' => 'EMP-021', 'name' => 'Theresa Evangelista', 'job_title' => 'Administrative Aide I', 'supervisor_id' => 'EMP-001', 'date_hired' => '2024-04-15'],
        ];

        DB::table('employees')->upsert(
            $employees,
            ['employee_id'],
            ['name', 'job_title', 'supervisor_id', 'date_hired'],
        );
    }
}
