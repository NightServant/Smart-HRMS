<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            // Phase 3 — HR Checking
            $table->string('hr_reviewer_id', 20)->nullable()->after('rejection_reason');
            $table->string('hr_decision', 20)->nullable()->after('hr_reviewer_id');
            $table->text('hr_remarks')->nullable()->after('hr_decision');
            $table->unsignedTinyInteger('hr_cycle_count')->default(0)->after('hr_remarks');

            // Phase 3B — Appeal
            $table->string('appeal_status', 30)->nullable()->after('hr_cycle_count');
            $table->timestamp('appeal_window_opens_at')->nullable()->after('appeal_status');
            $table->timestamp('appeal_window_closes_at')->nullable()->after('appeal_window_opens_at');

            // Phase 4 — PMT Validation
            $table->string('pmt_reviewer_id', 20)->nullable()->after('appeal_window_closes_at');
            $table->string('pmt_decision', 20)->nullable()->after('pmt_reviewer_id');
            $table->text('pmt_remarks')->nullable()->after('pmt_decision');
            $table->unsignedTinyInteger('pmt_cycle_count')->default(0)->after('pmt_remarks');

            // Phase 5 — Finalization
            $table->timestamp('finalized_at')->nullable()->after('pmt_cycle_count');
            $table->decimal('final_rating', 3, 2)->nullable()->after('finalized_at');
            $table->string('adjectival_rating', 30)->nullable()->after('final_rating');

            // Escalation
            $table->boolean('is_escalated')->default(false)->after('adjectival_rating');
            $table->text('escalation_reason')->nullable()->after('is_escalated');

            // Foreign keys
            $table->foreign('hr_reviewer_id')->references('employee_id')->on('employees')->nullOnDelete();
            $table->foreign('pmt_reviewer_id')->references('employee_id')->on('employees')->nullOnDelete();

            // Indexes for common queries
            $table->index('appeal_status');
            $table->index('is_escalated');
        });
    }

    public function down(): void
    {
        Schema::table('ipcr_submissions', function (Blueprint $table) {
            $table->dropForeign(['hr_reviewer_id']);
            $table->dropForeign(['pmt_reviewer_id']);
            $table->dropIndex(['appeal_status']);
            $table->dropIndex(['is_escalated']);

            $table->dropColumn([
                'hr_reviewer_id', 'hr_decision', 'hr_remarks', 'hr_cycle_count',
                'appeal_status', 'appeal_window_opens_at', 'appeal_window_closes_at',
                'pmt_reviewer_id', 'pmt_decision', 'pmt_remarks', 'pmt_cycle_count',
                'finalized_at', 'final_rating', 'adjectival_rating',
                'is_escalated', 'escalation_reason',
            ]);
        });
    }
};
