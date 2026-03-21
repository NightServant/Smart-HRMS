import { router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    unreadCount: number;
};

export default function NotificationsHeader({ unreadCount }: Props) {
    function handleMarkAllRead() {
        router.post('/notifications/mark-all-read', {}, { preserveScroll: true });
    }

    return (
        <div className="notif-header-shell flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                    <Bell className="notif-header-icon size-6 text-primary" />
                    Notifications Center
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Monitor alerts, reminders, and recent system activity in one place.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    className="inline-flex items-center gap-2"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                >
                    <CheckCheck className="size-4" />
                    Mark all as read
                </Button>
            </div>
        </div>
    );
}
