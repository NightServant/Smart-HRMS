<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->json('criteria_ratings')->nullable()->after('performance_rating');
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->dropColumn('criteria_ratings');
        });
    }
};
