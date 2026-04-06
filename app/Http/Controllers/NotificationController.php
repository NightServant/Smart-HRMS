<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $userId = $user->id;

        $notifications = Notification::query()
            ->where('user_id', $userId)
            ->latest()
            ->get()
            ->map(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'message' => $n->message,
                'documentType' => $n->document_type,
                'documentId' => $n->document_id,
                'targetUrl' => $this->resolveTargetUrl($n, $user),
                'isRead' => $n->is_read,
                'isImportant' => $n->is_important,
                'time' => $n->created_at->diffForHumans(),
            ]);

        $unreadCount = Notification::query()->where('user_id', $userId)->unread()->count();
        $warningCount = Notification::query()->where('user_id', $userId)->important()->count();
        $todayCount = Notification::query()->where('user_id', $userId)->today()->count();

        return Inertia::render('notifications', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'warningCount' => $warningCount,
            'todayCount' => $todayCount,
        ]);
    }

    public function markAsRead(Notification $notification): RedirectResponse
    {
        $notification->update(['is_read' => true]);

        return back();
    }

    public function dismiss(Notification $notification): RedirectResponse
    {
        $notification->delete();

        return back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        Notification::query()
            ->where('user_id', $request->user()->id)
            ->unread()
            ->update(['is_read' => true]);

        return back();
    }

    private function resolveTargetUrl(Notification $notification, User $user): string
    {
        if ($notification->type === 'ipcr_period_opened') {
            return $user->role === User::ROLE_EVALUATOR
                ? route('document-management')
                : route('submit-evaluation');
        }

        if ($notification->type === 'ipcr_target_window_opened') {
            return route('ipcr.target');
        }

        if ($notification->type === 'training_suggestion') {
            return route('dashboard');
        }

        return match ($notification->document_type) {
            'ipcr' => $this->resolveIpcrTargetUrl($notification, $user),
            'leave' => $this->resolveLeaveTargetUrl($user),
            default => route('notifications'),
        };
    }

    private function resolveIpcrTargetUrl(Notification $notification, User $user): string
    {
        $submission = $notification->document_id
            ? IpcrSubmission::query()->find($notification->document_id)
            : null;

        return match ($user->role) {
            User::ROLE_EMPLOYEE => $this->resolveEmployeeIpcrTargetUrl($notification, $submission),
            User::ROLE_EVALUATOR => $submission
                ? route('evaluation-page', ['employee_id' => $submission->employee_id])
                : route('document-management'),
            User::ROLE_HR_PERSONNEL => $notification->type === 'ipcr_pending_finalization'
                ? route('admin.hr-finalize')
                : route('admin.hr-review'),
            User::ROLE_PMT => route('admin.pmt-review'),
            default => route('notifications'),
        };
    }

    private function resolveEmployeeIpcrTargetUrl(Notification $notification, ?IpcrSubmission $submission): string
    {
        if ($notification->type === 'ipcr_appeal_window' && $submission) {
            return route('ipcr.appeal', $submission);
        }

        if ($submission) {
            return route('ipcr.form', ['submission_id' => $submission->id]);
        }

        return route('submit-evaluation');
    }

    private function resolveLeaveTargetUrl(User $user): string
    {
        return match ($user->role) {
            User::ROLE_EMPLOYEE => route('leave-application'),
            User::ROLE_EVALUATOR => route('admin.leave-management'),
            User::ROLE_HR_PERSONNEL => route('admin.hr-leave-management'),
            default => route('notifications'),
        };
    }
}
