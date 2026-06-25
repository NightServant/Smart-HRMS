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
        if (! Schema::hasTable('seminars')) {
            return;
        }

        if (! Schema::hasColumn('seminars', 'title')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('title')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'description')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('description')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'location')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('location')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'time')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('time')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'speaker')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('speaker')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'target_performance_area')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->string('target_performance_area')->nullable();
            });
        }
        if (! Schema::hasColumn('seminars', 'date')) {
            Schema::table('seminars', function (Blueprint $table) {
                $table->date('date')->nullable();
            });
        }

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seminars', function (Blueprint $table) {
            $table->dropColumn([
                'title',
                'description',
                'location',
                'time',
                'speaker',
                'target_performance_area',
                'date',
            ]);
        });
    }
};
