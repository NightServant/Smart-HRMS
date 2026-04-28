<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('departments')
            ->where('name', 'Performance Management Team')
            ->update(['name' => 'Human Resource Management Office']);
    }

    public function down(): void
    {
        DB::table('departments')
            ->where('name', 'Human Resource Management Office')
            ->update(['name' => 'Performance Management Team']);
    }
};
