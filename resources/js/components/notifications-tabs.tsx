import NotificationSnackbar from '@/components/notification-snackbar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

type Props = {
    notifications: Notification[];
    unreadCount: number;
};

function mapType(type: string): 'info' | 'warning' | 'success' {
    if (type === 'warning' || type === 'rejection') return 'warning';
    if (type === 'success' || type === 'approval') return 'success';
    return 'info';
}

function EmptyState({ message }: { message: string }) {
    return (
        <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
    );
}

export default function NotificationsTabs({ notifications, unreadCount }: Props) {
    const unread = notifications.filter((n) => !n.isRead);
    const important = notifications.filter((n) => n.isImportant);

    return (
        <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
                <TabsTrigger value="all" className="min-h-10 rounded-xl border border-border/70 bg-background/70">
                    All
                </TabsTrigger>
                <TabsTrigger value="important" className="min-h-10 rounded-xl border border-border/70 bg-background/70">
                    Important
                </TabsTrigger>
                <TabsTrigger value="unread" className="min-h-10 rounded-xl border border-border/70 bg-background/70">
                    Unread {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4 space-y-3 sm:space-y-4">
                {notifications.length === 0 ? (
                    <EmptyState message="No notifications yet." />
                ) : (
                    notifications.map((n) => (
                        <NotificationSnackbar
                            key={n.id}
                            id={n.id}
                            title={n.title}
                            message={n.message}
                            time={n.time}
                            targetUrl={n.targetUrl}
                            type={mapType(n.type)}
                            isRead={n.isRead}
                        />
                    ))
                )}
            </TabsContent>

            <TabsContent value="unread" className="mt-4 space-y-3 sm:space-y-4">
                {unread.length === 0 ? (
                    <EmptyState message="All caught up!" />
                ) : (
                    unread.map((n) => (
                        <NotificationSnackbar
                            key={n.id}
                            id={n.id}
                            title={n.title}
                            message={n.message}
                            time={n.time}
                            targetUrl={n.targetUrl}
                            type={mapType(n.type)}
                            isRead={n.isRead}
                        />
                    ))
                )}
            </TabsContent>

            <TabsContent value="important" className="mt-4 space-y-3 sm:space-y-4">
                {important.length === 0 ? (
                    <EmptyState message="No important notifications." />
                ) : (
                    important.map((n) => (
                        <NotificationSnackbar
                            key={n.id}
                            id={n.id}
                            title={n.title}
                            message={n.message}
                            time={n.time}
                            targetUrl={n.targetUrl}
                            type={mapType(n.type)}
                            isRead={n.isRead}
                        />
                    ))
                )}
            </TabsContent>
        </Tabs>
    );
}
