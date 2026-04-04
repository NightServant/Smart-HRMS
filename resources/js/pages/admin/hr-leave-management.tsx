import { Head } from '@inertiajs/react';
import { CheckCircle2, Inbox, ListFilter, XCircle } from 'lucide-react';
import HrLeaveManagementTable from '@/components/hr-leave-management-table';
import type { LeaveRequestDetail } from '@/components/leave-detail-dialog';
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

type HrStats = {
    pendingReview: number;
    fullyApproved: number;
    rejectedByHr: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'HR Leave Management',
        href: admin.hrLeaveManagement().url,
    },
];

export default function HrLeaveManagement({
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
    stats: HrStats;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="HR Leave Management" />
            <div className="app-page-shell app-page-stack lg:items-stretch">
                <div className="app-stats-grid">
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending HR Review
                            </CardTitle>
                            <Inbox className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.pendingReview}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Forwarded by evaluator
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Fully Approved
                            </CardTitle>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.fullyApproved}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Approved by both DH and HR
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Rejected by HR
                            </CardTitle>
                            <XCircle className="size-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.rejectedByHr}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Denied at HR stage
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
                <HrLeaveManagementTable
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
