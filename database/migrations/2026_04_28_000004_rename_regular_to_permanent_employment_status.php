<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('employees')
            ->where('employment_status', 'regular')
            ->update(['employment_status' => 'permanent']);

        Schema::table('employees', function (Blueprint $table): void {
            $table->string('employment_status', 20)->default('permanent')->change();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('employment_status', 20)->default('regular')->change();
        });

        DB::table('employees')
            ->where('employment_status', 'permanent')
            ->update(['employment_status' => 'regular']);
    }
};
