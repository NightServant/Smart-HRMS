import { Head } from '@inertiajs/react';
import { Archive, Database, LogIn, UserCog, Workflow } from 'lucide-react';
import { AdminActivityLogsTable } from '@/components/admin-activity-logs-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types/navigation';

type Props = {
    logs: {
        id: number;
        createdAt: string | null;
        userName: string;
        userId: number | null;
        actionType: string;
        description: string;
        ipAddress: string | null;
    }[];
    filters: {
        search: string;
        actionType: string;
        dateFrom: string;
        dateTo: string;
    };
    actionTypes: string[];
    summary: {
        total: number;
        loginEvents: number;
        userEvents: number;
        workflowEvents: number;
        dataEvents: number;
    };
    pagination: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Activity Logs',
        href: admin.activityLogs().url,
    },
];

export default function ActivityLogs(props: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Logs" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Total Events</CardTitle>
                            <Archive className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.total}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Login Events</CardTitle>
                            <LogIn className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.loginEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">User Events</CardTitle>
                            <UserCog className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.userEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Workflow Events</CardTitle>
                            <Workflow className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.workflowEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Data Events</CardTitle>
                            <Database className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.dataEvents}</p></CardContent>
                    </Card>
                </div>

                <AdminActivityLogsTable
                    logs={props.logs}
                    filters={props.filters}
                    actionTypes={props.actionTypes}
                    pagination={props.pagination}
                />
            </div>
        </AppLayout>
    );
}
