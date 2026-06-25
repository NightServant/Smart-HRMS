<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwr_audit_log', function (Blueprint $table): void {
            $table->index('employee_id');
            $table->index('document_type');
            $table->index('document_id');
            $table->index(['document_type', 'document_id'], 'iwr_audit_log_document_type_document_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('iwr_audit_log', function (Blueprint $table): void {
            $table->dropIndex(['employee_id']);
            $table->dropIndex(['document_type']);
            $table->dropIndex(['document_id']);
            $table->dropIndex('iwr_audit_log_document_type_document_id_index');
        });
    }
};
