import { Head } from '@inertiajs/react';
import { CheckCircle2, Inbox, ListFilter, XCircle } from 'lucide-react';
import type { LeaveRequestDetail } from '@/components/leave-detail-dialog';
import LeaveRequestTable from '@/components/leave-request-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type EvalStats = {
    pendingReview: number;
    approvedByDh: number;
    returnedByDh: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Leave Management',
        href: admin.leaveManagement().url,
    },
];

export default function LeaveManagement({
    leaveRequests,
    search,
    leaveTypeFilter = '',
    statusFilter = '',
    stageFilter = '',
    leaveTypeOptions = [],
    statusOptions = [],
    stageOptions = [],
    pagination,
    stats,
}: {
    leaveRequests: LeaveRequestDetail[];
    search: string;
    leaveTypeFilter?: string;
    statusFilter?: string;
    stageFilter?: string;
    leaveTypeOptions?: string[];
    statusOptions?: string[];
    stageOptions?: string[];
    pagination: PaginationMeta;
    stats: EvalStats;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave Management" />
            <div className="app-page-shell app-page-stack lg:items-stretch">
                <div className="app-stats-grid">
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending Your Review
                            </CardTitle>
                            <Inbox className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.pendingReview}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Awaiting evaluator decision
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Approved by DH
                            </CardTitle>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.approvedByDh}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Forwarded to HR
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Returned by DH
                            </CardTitle>
                            <XCircle className="size-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.returnedByDh}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Sent back to employee
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Requests
                            </CardTitle>
                            <ListFilter className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.total}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                All time
                            </p>
                        </CardContent>
                    </Card>
                </div>
                <LeaveRequestTable
                    leaveRequests={leaveRequests}
                    search={search}
                    leaveTypeFilter={leaveTypeFilter}
                    statusFilter={statusFilter}
                    stageFilter={stageFilter}
                    leaveTypeOptions={leaveTypeOptions}
                    statusOptions={statusOptions}
                    stageOptions={stageOptions}
                    pagination={pagination}
                />
            </div>
        </AppLayout>
    );
}
