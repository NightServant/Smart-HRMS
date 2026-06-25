import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
    unreadCount: number;
    warningCount: number;
    todayCount: number;
};

export default function NotificationsSummaryCards({ unreadCount, warningCount, todayCount }: Props) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="glass-card notif-summary-card border-primary/20 bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Unread</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold text-primary">{unreadCount}</CardContent>
            </Card>
            <Card className="glass-card notif-summary-card notif-delay-1 border-chart-3/30 bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Important</CardTitle>
                </CardHeader>
                <CardContent className="inline-flex items-center gap-2 text-2xl font-bold">
                    {warningCount}
                    {warningCount > 0 && <TriangleAlert className="size-5 text-chart-3" />}
                </CardContent>
            </Card>
            <Card className="glass-card notif-summary-card notif-delay-2 border-secondary/35 bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Today</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold text-secondary-foreground">{todayCount}</CardContent>
            </Card>
        </div>
    );
}
