<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->unsignedInteger('appeal_count')->default(0)->after('appeal_window_closes_at');
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->dropColumn('appeal_count');
        });
    }
};
