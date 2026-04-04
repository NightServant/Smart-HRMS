<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remove IPCR audit log entries before truncating submissions
        DB::table('iwr_audit_log')->where('document_type', 'ipcr')->delete();

        if (DB::getDriverName() === 'sqlite') {
            DB::table('ipcr_appeals')->delete();
            DB::table('ipcr_submissions')->delete();

            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('ipcr_appeals')->truncate();
        DB::table('ipcr_submissions')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    public function down(): void
    {
        // Data truncation is irreversible
    }
};
