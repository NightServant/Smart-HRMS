<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seminars', function (Blueprint $table): void {
            $table->string('rating_tier', 5)->nullable()->after('target_performance_area');
            $table->date('date')->nullable()->change();
            $table->string('location')->nullable()->change();
            $table->string('time')->nullable()->change();
            $table->string('speaker')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('seminars', function (Blueprint $table): void {
            $table->dropColumn('rating_tier');
        });
    }
};
