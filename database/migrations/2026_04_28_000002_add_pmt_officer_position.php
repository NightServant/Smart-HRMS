<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('employee_positions')->where('name', 'PMT Officer')->exists();

        if (! $exists) {
            DB::table('employee_positions')->insert([
                'name' => 'PMT Officer',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('employee_positions')->where('name', 'PMT Officer')->delete();
    }
};
