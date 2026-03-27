import { Head } from '@inertiajs/react';
import LeaveRequestTable from '@/components/leave-request-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type LeaveRequest = {
    id: number;
    name: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status?: string;
    stage?: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
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
    pagination,
}: {
    leaveRequests: LeaveRequest[];
    search: string;
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave Management" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <LeaveRequestTable leaveRequests={leaveRequests} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
