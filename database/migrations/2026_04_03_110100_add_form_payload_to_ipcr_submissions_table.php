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
            $table->json('form_payload')->nullable()->after('criteria_ratings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->dropColumn('form_payload');
        });
    }
};
