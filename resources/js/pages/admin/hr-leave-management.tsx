import { Head } from '@inertiajs/react';
import HrLeaveManagementTable from '@/components/hr-leave-management-table';
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
    dhDecision?: number;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
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
    pagination,
}: {
    leaveRequests: LeaveRequest[];
    search: string;
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="HR Leave Management" />
            <div className="p-4 mx-auto flex w-full flex-col gap-6 lg:items-stretch">
                <HrLeaveManagementTable leaveRequests={leaveRequests} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
