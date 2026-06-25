<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcr_targets', function (Blueprint $table) {
            // `source` distinguishes records produced by the live submission
            // flow from those entered retroactively by HR via the Phase 3
            // Historical Entry tool. Analytics and PPE/ATRE training data can
            // filter on this column to weight or exclude backfilled records.
            $table->string('source', 20)->default('live')->after('hr_finalized');
            $table->index('source');
        });

        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->string('source', 20)->default('live')->after('escalation_reason');
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_targets', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });

        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });
    }
};
