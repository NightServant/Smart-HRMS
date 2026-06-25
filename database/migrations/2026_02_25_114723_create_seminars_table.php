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
            Schema::create('seminars', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('description');
                $table->string('location');
                $table->string('time');
                $table->string('speaker');
                $table->string('target_performance_area');
                $table->date('date');
                $table->timestamps();
            });

            return;
        }

        Schema::table('seminars', function (Blueprint $table) {
            if (! Schema::hasColumn('seminars', 'title')) {
                $table->string('title')->after('id');
            }
            if (! Schema::hasColumn('seminars', 'description')) {
                $table->string('description')->after('title');
            }
            if (! Schema::hasColumn('seminars', 'location')) {
                $table->string('location')->after('description');
            }
            if (! Schema::hasColumn('seminars', 'time')) {
                $table->string('time')->after('location');
            }
            if (! Schema::hasColumn('seminars', 'speaker')) {
                $table->string('speaker')->after('time');
            }
            if (! Schema::hasColumn('seminars', 'target_performance_area')) {
                $table->string('target_performance_area')->after('speaker');
            }
            if (! Schema::hasColumn('seminars', 'date')) {
                $table->date('date')->after('target_performance_area');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seminars');
    }
};
