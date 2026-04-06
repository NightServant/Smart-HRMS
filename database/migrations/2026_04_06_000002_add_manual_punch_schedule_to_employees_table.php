<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->text('manual_punch_reason')->nullable()->after('manual_punch_enabled');
            $table->date('manual_punch_start_date')->nullable()->after('manual_punch_reason');
            $table->date('manual_punch_end_date')->nullable()->after('manual_punch_start_date');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn([
                'manual_punch_reason',
                'manual_punch_start_date',
                'manual_punch_end_date',
            ]);
        });
    }
};
