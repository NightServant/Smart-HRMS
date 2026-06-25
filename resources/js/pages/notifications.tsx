import { Head, usePage } from '@inertiajs/react';
import NotificationsHeader from '@/components/notifications-header';
import NotificationsSummaryCards from '@/components/notifications-summary-cards';
import NotificationsTabs from '@/components/notifications-tabs';
import AppLayout from '@/layouts/app-layout';
import { notifications as notificationsRoute } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Notification = {
    id: number;
    type: string;
    title: string;
    message: string;
    documentType: string | null;
    documentId: number | null;
    targetUrl: string | null;
    isRead: boolean;
    isImportant: boolean;
    time: string;
};

type PageProps = {
    notifications: Notification[];
    unreadCount: number;
    warningCount: number;
    todayCount: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notifications',
        href: notificationsRoute().url,
    },
];

export default function Notifications() {
    const { notifications, unreadCount, warningCount, todayCount } =
        usePage<PageProps>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <div className="app-page-shell app-page-stack">
                <NotificationsHeader unreadCount={unreadCount} />
                <NotificationsSummaryCards
                    unreadCount={unreadCount}
                    warningCount={warningCount}
                    todayCount={todayCount}
                />
                <NotificationsTabs
                    notifications={notifications}
                    unreadCount={unreadCount}
                />
            </div>
        </AppLayout>
    );
}
