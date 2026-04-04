<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('historical_data_records', function (Blueprint $table): void {
            $table->string('period', 5)->nullable()->after('quarter');
        });

        // Populate period from existing quarter data: Q1/Q2 → S1, Q3/Q4 → S2
        DB::table('historical_data_records')
            ->whereIn('quarter', ['Q1', 'Q2'])
            ->update(['period' => 'S1']);

        DB::table('historical_data_records')
            ->whereIn('quarter', ['Q3', 'Q4'])
            ->update(['period' => 'S2']);
    }

    public function down(): void
    {
        Schema::table('historical_data_records', function (Blueprint $table): void {
            $table->dropColumn('period');
        });
    }
};
