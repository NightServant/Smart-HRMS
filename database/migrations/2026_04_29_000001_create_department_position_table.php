<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_position', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('employee_positions')->cascadeOnDelete();
            $table->string('linked_role', 30)->default('employee');
            $table->timestamps();
            $table->unique(['department_id', 'position_id']);
        });

        $adminOfficeId = DB::table('departments')->where('name', 'Administrative Office')->value('id');
        $hrmoId = DB::table('departments')->where('name', 'Human Resource Management Office')->value('id');
        $positionIds = DB::table('employee_positions')->pluck('id', 'name');

        $rows = [];

        if ($adminOfficeId) {
            foreach ([
                'Department Head' => 'evaluator',
                'Administrative Officer II' => 'employee',
                'Administrative Aide I' => 'employee',
            ] as $name => $role) {
                if (isset($positionIds[$name])) {
                    $rows[] = [
                        'department_id' => $adminOfficeId,
                        'position_id' => $positionIds[$name],
                        'linked_role' => $role,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        if ($hrmoId) {
            foreach ([
                'Department Head' => 'hr-personnel',
                'PMT Officer' => 'pmt',
            ] as $name => $role) {
                if (isset($positionIds[$name])) {
                    $rows[] = [
                        'department_id' => $hrmoId,
                        'position_id' => $positionIds[$name],
                        'linked_role' => $role,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        if (! empty($rows)) {
            DB::table('department_position')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('department_position');
    }
};
