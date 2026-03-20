<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

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
}
