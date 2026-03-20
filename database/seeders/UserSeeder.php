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
            // Department Head → evaluator role
            ['name' => 'John Reyes', 'email' => 'john.reyes@shrms.test', 'password' => $password, 'role' => 'evaluator', 'employee_id' => 'EMP-001'],

            // Administrative Officers II → employee role
            ['name' => 'Maria Santos', 'email' => 'maria.santos@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-002'],
            ['name' => 'Mark Bautista', 'email' => 'mark.bautista@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-003'],
            ['name' => 'Angela Cruz', 'email' => 'angela.cruz@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-004'],

            // Administrative Aides I → employee role
            ['name' => 'Patricia Garcia', 'email' => 'patricia.garcia@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-005'],
            ['name' => 'Kevin Mendoza', 'email' => 'kevin.mendoza@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-006'],
            ['name' => 'Lorraine Flores', 'email' => 'lorraine.flores@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-007'],
            ['name' => 'Daniel Ramos', 'email' => 'daniel.ramos@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-008'],
            ['name' => 'Camille Navarro', 'email' => 'camille.navarro@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-009'],
            ['name' => 'Joshua Aquino', 'email' => 'joshua.aquino@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-010'],
            ['name' => 'Ana Dela Cruz', 'email' => 'ana.delacruz@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-011'],
            ['name' => 'Ramon Villanueva', 'email' => 'ramon.villanueva@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-012'],
            ['name' => 'Josephine Pascual', 'email' => 'josephine.pascual@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-013'],
            ['name' => 'Michael Torres', 'email' => 'michael.torres@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-014'],
            ['name' => 'Liza Castillo', 'email' => 'liza.castillo@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-015'],
            ['name' => 'Roberto Jimenez', 'email' => 'roberto.jimenez@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-016'],
            ['name' => 'Christine Morales', 'email' => 'christine.morales@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-017'],
            ['name' => 'Ferdinand Aguilar', 'email' => 'ferdinand.aguilar@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-018'],
            ['name' => 'Maricel Dela Rosa', 'email' => 'maricel.delarosa@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-019'],
            ['name' => 'Benedict Mercado', 'email' => 'benedict.mercado@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-020'],
            ['name' => 'Theresa Evangelista', 'email' => 'theresa.evangelista@shrms.test', 'password' => $password, 'role' => 'employee', 'employee_id' => 'EMP-021'],

            // Fictional HR user (not in org chart)
            ['name' => 'HR Admin', 'email' => 'hr.admin@shrms.test', 'password' => $password, 'role' => 'hr-personnel', 'employee_id' => null],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
