<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwr_audit_log', function (Blueprint $table): void {
            $table->string('document_type', 32)->change();
        });
    }

    public function down(): void
    {
        Schema::table('iwr_audit_log', function (Blueprint $table): void {
            $table->string('document_type', 10)->change();
        });
    }
};
