import { Head } from '@inertiajs/react';
import AttendanceCard from '@/components/attendance-card';
import AppLayout from '@/layouts/app-layout';
import { attendance } from '@/routes';
import type { BreadcrumbItem } from '@/types';

export default function Attendance() {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Attendance',
            href: attendance().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <AttendanceCard />
        </AppLayout>
    );
}
