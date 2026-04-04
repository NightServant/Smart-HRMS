import { Head } from '@inertiajs/react';
import { Archive, ShieldAlert, Workflow } from 'lucide-react';
import { AdminAuditLogsTable } from '@/components/admin-audit-logs-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Props = {
    logs: {
        id: number;
        loggedAt: string | null;
        employeeName: string;
        employeeId: string;
        documentType: string;
        documentReference: string;
        routingAction: string;
        confidencePct: number | null;
        compliancePassed: boolean;
        status?: string | null;
        stage?: string | null;
    }[];
    filters: {
        search: string;
        documentType: string;
        routingAction: string;
        compliance: string;
        dateFrom: string;
        dateTo: string;
    };
    routingActions: string[];
    summary: {
        total: number;
        leaveEvents: number;
        ipcrEvents: number;
        lowConfidenceEvents: number;
        failedComplianceEvents: number;
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
        title: 'Audit Logs',
        href: admin.auditLogs().url,
    },
];

export default function AuditLogs(props: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
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
                            <CardTitle className="text-sm">Leave Events</CardTitle>
                            <Workflow className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.leaveEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">IPCR Events</CardTitle>
                            <Workflow className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.ipcrEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Low Confidence</CardTitle>
                            <ShieldAlert className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.lowConfidenceEvents}</p></CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Failed Compliance</CardTitle>
                            <ShieldAlert className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent><p className="text-3xl font-bold">{props.summary.failedComplianceEvents}</p></CardContent>
                    </Card>
                </div>

                <AdminAuditLogsTable
                    logs={props.logs}
                    filters={props.filters}
                    routingActions={props.routingActions}
                    pagination={props.pagination}
                />
            </div>
        </AppLayout>
    );
}
