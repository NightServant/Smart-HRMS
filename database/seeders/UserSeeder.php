<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password');

        $users = [
            ['name' => 'System Administrator', 'email' => 'admin@shrms.test', 'password' => $password, 'role' => User::ROLE_ADMINISTRATOR, 'employee_id' => null, 'email_verified_at' => now(), 'is_active' => true],

            // Department Head → evaluator role
            ['name' => 'John Reyes', 'email' => 'john.reyes@shrms.test', 'password' => $password, 'role' => User::ROLE_EVALUATOR, 'employee_id' => 'EMP-001', 'email_verified_at' => now(), 'is_active' => true],

            // Administrative Officers II → employee role
            ['name' => 'Maria Santos', 'email' => 'maria.santos@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-002', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Mark Bautista', 'email' => 'mark.bautista@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-003', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Angela Cruz', 'email' => 'angela.cruz@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-004', 'email_verified_at' => now(), 'is_active' => true],

            // Administrative Aides I → employee role
            ['name' => 'Patricia Garcia', 'email' => 'patricia.garcia@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-005', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Kevin Mendoza', 'email' => 'kevin.mendoza@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-006', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Lorraine Flores', 'email' => 'lorraine.flores@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-007', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Daniel Ramos', 'email' => 'daniel.ramos@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-008', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Camille Navarro', 'email' => 'camille.navarro@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-009', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Joshua Aquino', 'email' => 'joshua.aquino@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-010', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Ana Dela Cruz', 'email' => 'ana.delacruz@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-011', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Ramon Villanueva', 'email' => 'ramon.villanueva@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-012', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Josephine Pascual', 'email' => 'josephine.pascual@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-013', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Michael Torres', 'email' => 'michael.torres@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-014', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Liza Castillo', 'email' => 'liza.castillo@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-015', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Roberto Jimenez', 'email' => 'roberto.jimenez@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-016', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Christine Morales', 'email' => 'christine.morales@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-017', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Ferdinand Aguilar', 'email' => 'ferdinand.aguilar@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-018', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Maricel Dela Rosa', 'email' => 'maricel.delarosa@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-019', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Benedict Mercado', 'email' => 'benedict.mercado@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-020', 'email_verified_at' => now(), 'is_active' => true],
            ['name' => 'Theresa Evangelista', 'email' => 'theresa.evangelista@shrms.test', 'password' => $password, 'role' => User::ROLE_EMPLOYEE, 'employee_id' => 'EMP-021', 'email_verified_at' => now(), 'is_active' => true],

            // HR Personnel (not in org chart, required for leave workflow Stage 2)
            ['name' => 'Grace Tan', 'email' => 'grace.tan@shrms.test', 'password' => $password, 'role' => User::ROLE_HR_PERSONNEL, 'employee_id' => null, 'email_verified_at' => now(), 'is_active' => true],

            // PMT reviewer
            ['name' => 'Mark Reyes', 'email' => 'mark.reyes@shrms.test', 'password' => $password, 'role' => User::ROLE_PMT, 'employee_id' => null, 'email_verified_at' => now(), 'is_active' => true],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
