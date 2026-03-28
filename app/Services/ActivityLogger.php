<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\IpcrSubmission;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;

class ActivityLogger
{
    public static function logLogin(Request $request, User $user): void
    {
        ActivityLog::log('login', "User {$user->name} logged in.", $request, [
            'user_id' => $user->id,
        ]);
    }

    public static function logLogout(Request $request, User $user): void
    {
        ActivityLog::log('logout', "User {$user->name} logged out.", $request, [
            'user_id' => $user->id,
        ]);
    }

    public static function logUserCreated(User $createdUser, Request $request): void
    {
        ActivityLog::log('user.create', "Created user account for {$createdUser->name} ({$createdUser->role}).", $request, [
            'affected_user_id' => $createdUser->id,
            'role' => $createdUser->role,
        ]);
    }

    public static function logUserUpdated(User $updatedUser, Request $request): void
    {
        ActivityLog::log('user.update', "Updated user account for {$updatedUser->name}.", $request, [
            'affected_user_id' => $updatedUser->id,
        ]);
    }

    public static function logUserActivated(User $activatedUser, Request $request): void
    {
        ActivityLog::log('user.activate', "Activated user account for {$activatedUser->name}.", $request, [
            'affected_user_id' => $activatedUser->id,
        ]);
    }

    public static function logUserDeactivated(User $deactivatedUser, Request $request): void
    {
        ActivityLog::log('user.deactivate', "Deactivated user account for {$deactivatedUser->name}.", $request, [
            'affected_user_id' => $deactivatedUser->id,
        ]);
    }

    public static function logPasswordReset(User $user, Request $request): void
    {
        ActivityLog::log('password.reset', "Sent password reset email to {$user->name}.", $request, [
            'affected_user_id' => $user->id,
        ]);
    }

    public static function logDataImport(string $type, int $recordCount, Request $request): void
    {
        ActivityLog::log('data.import', "Imported {$recordCount} {$type} records.", $request, [
            'type' => $type,
            'record_count' => $recordCount,
        ]);
    }

    public static function logDataExport(string $type, Request $request): void
    {
        ActivityLog::log('data.export', "Exported {$type} data.", $request, [
            'type' => $type,
        ]);
    }

    public static function logLeaveApproval(LeaveRequest $leave, Request $request): void
    {
        ActivityLog::log('leave.approve', "Approved leave request #{$leave->id} for employee {$leave->employee_id}.", $request, [
            'leave_id' => $leave->id,
            'employee_id' => $leave->employee_id,
        ]);
    }

    public static function logLeaveRejection(LeaveRequest $leave, Request $request): void
    {
        ActivityLog::log('leave.reject', "Rejected leave request #{$leave->id} for employee {$leave->employee_id}.", $request, [
            'leave_id' => $leave->id,
            'employee_id' => $leave->employee_id,
        ]);
    }

    public static function logIpcrSubmission(IpcrSubmission $ipcr, Request $request): void
    {
        ActivityLog::log('ipcr.submit', "Submitted IPCR for employee {$ipcr->employee_id}.", $request, [
            'ipcr_id' => $ipcr->id,
            'employee_id' => $ipcr->employee_id,
        ]);
    }

    public static function logIpcrEvaluation(IpcrSubmission $ipcr, Request $request): void
    {
        ActivityLog::log('ipcr.evaluate', "Evaluated IPCR #{$ipcr->id} for employee {$ipcr->employee_id}.", $request, [
            'ipcr_id' => $ipcr->id,
            'employee_id' => $ipcr->employee_id,
        ]);
    }
}
