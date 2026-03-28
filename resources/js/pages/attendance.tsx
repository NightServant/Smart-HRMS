import { Head } from '@inertiajs/react';
import AttendanceScanner from '@/components/attendance-scanner';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type AttendanceRecord = {
    id: number;
    date: string;
    punchTime: string;
    status: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Attendance',
        href: '/attendance',
    },
];

export default function Attendance({
    records,
    employeeId,
    hasDevice,
}: {
    records: AttendanceRecord[];
    employeeId: string;
    hasDevice: boolean;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="mx-auto flex w-full flex-col gap-6 p-4">
                <AttendanceScanner records={records} employeeId={employeeId} hasDevice={hasDevice} />
            </div>
        </AppLayout>
    );
}
