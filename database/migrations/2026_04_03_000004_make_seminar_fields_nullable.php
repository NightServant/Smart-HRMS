<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seminars', function (Blueprint $table): void {
            $table->string('title')->nullable()->change();
            $table->string('location')->nullable()->change();
            $table->string('time')->nullable()->change();
            $table->string('speaker')->nullable()->change();
            $table->date('date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('seminars', function (Blueprint $table): void {
            $table->string('title')->nullable(false)->change();
            $table->string('location')->nullable(false)->change();
            $table->string('time')->nullable(false)->change();
            $table->string('speaker')->nullable(false)->change();
            $table->date('date')->nullable(false)->change();
        });
    }
};
