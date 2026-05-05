<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // notifications: every page load queries (user_id, is_read)
        Schema::table('notifications', function (Blueprint $table): void {
            $table->index(['user_id', 'is_read'], 'notifications_user_id_is_read_index');
        });

        // leave_requests: reports filter by created_at date range + status
        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'leave_requests_status_created_at_index');
            $table->index('created_at', 'leave_requests_created_at_index');
        });

        // attendance_records: reports filter by date range + status
        Schema::table('attendance_records', function (Blueprint $table): void {
            $table->index(['date', 'status'], 'attendance_records_date_status_index');
        });

        // iwr_audit_log: reports filter by logged_at date range + compliance_passed
        Schema::table('iwr_audit_log', function (Blueprint $table): void {
            $table->index(['logged_at', 'compliance_passed'], 'iwr_audit_log_logged_at_compliance_index');
        });

        // ipcr_submissions: reports filter by created_at + performance_rating
        Schema::table('ipcr_submissions', function (Blueprint $table): void {
            $table->index(['created_at', 'performance_rating'], 'ipcr_submissions_created_at_rating_index');
        });

        // seminars: reports filter by date
        Schema::table('seminars', function (Blueprint $table): void {
            $table->index('date', 'seminars_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', fn (Blueprint $t) => $t->dropIndex('notifications_user_id_is_read_index'));
        Schema::table('leave_requests', function (Blueprint $t): void {
            $t->dropIndex('leave_requests_status_created_at_index');
            $t->dropIndex('leave_requests_created_at_index');
        });
        Schema::table('attendance_records', fn (Blueprint $t) => $t->dropIndex('attendance_records_date_status_index'));
        Schema::table('iwr_audit_log', fn (Blueprint $t) => $t->dropIndex('iwr_audit_log_logged_at_compliance_index'));
        Schema::table('ipcr_submissions', fn (Blueprint $t) => $t->dropIndex('ipcr_submissions_created_at_rating_index'));
        Schema::table('seminars', fn (Blueprint $t) => $t->dropIndex('seminars_date_index'));
    }
};
