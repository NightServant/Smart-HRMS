import { Head } from '@inertiajs/react';
import { AttendanceTable } from '@/components/attendance-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type AttendanceRecord = {
    id: number;
    employee_name: string;
    date: string;
    punch_time: string;
    status: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Attendance Management',
        href: admin.attendanceManagement().url,
    },
];

export default function AttendanceManagement({
    attendances,
    search,
    pagination,
}: {
    attendances: AttendanceRecord[];
    search: string;
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance Management" />
            <div className="p-4 mx-auto flex w-full flex-col gap-6 lg:items-stretch">
                <AttendanceTable attendances={attendances} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
