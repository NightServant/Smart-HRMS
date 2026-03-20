<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('employee_id', 20)->nullable()->after('user_id');
            $table->integer('days_requested')->nullable()->after('end_date');
            $table->boolean('has_medical_certificate')->default(false)->after('solo_parent_id_path');
            $table->boolean('has_solo_parent_id')->default(false)->after('has_medical_certificate');
            $table->boolean('has_marriage_certificate')->default(false)->after('has_solo_parent_id');

            // Decision state fields
            $table->tinyInteger('dh_decision')->default(0)->after('has_marriage_certificate'); // 0=pending 1=approved 2=rejected
            $table->tinyInteger('hr_decision')->default(0)->after('dh_decision');
            $table->tinyInteger('has_rejection_reason')->default(0)->after('hr_decision');
            $table->text('rejection_reason_text')->nullable()->after('has_rejection_reason');

            // IWR response fields
            $table->string('stage', 50)->nullable()->after('status');
            $table->string('routing_action', 50)->nullable()->after('stage');
            $table->string('approver_id', 20)->nullable()->after('routing_action');
            $table->decimal('confidence_pct', 5, 2)->nullable()->after('approver_id');
            $table->text('notification')->nullable()->after('confidence_pct');

            $table->foreign('employee_id')
                ->references('employee_id')
                ->on('employees');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn([
                'employee_id', 'days_requested',
                'has_medical_certificate', 'has_solo_parent_id', 'has_marriage_certificate',
                'dh_decision', 'hr_decision', 'has_rejection_reason', 'rejection_reason_text',
                'stage', 'routing_action', 'approver_id', 'confidence_pct', 'notification',
            ]);
        });
    }
};
