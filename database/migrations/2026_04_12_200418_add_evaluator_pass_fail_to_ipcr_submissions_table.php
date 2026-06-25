<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table): void {
            $table->string('evaluator_pass_fail', 10)->nullable()->after('rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table): void {
            $table->dropColumn('evaluator_pass_fail');
        });
    }
};
