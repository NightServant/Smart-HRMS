<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropUnique(['zkteco_pin']);
            $table->string('zkteco_pin', 50)->nullable()->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropUnique(['zkteco_pin']);
            $table->unsignedInteger('zkteco_pin')->nullable()->unique()->change();
        });
    }
};
