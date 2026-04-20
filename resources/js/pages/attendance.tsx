import { Head, usePoll } from '@inertiajs/react';
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
    manualPunchEnabled = false,
}: {
    records: AttendanceRecord[];
    employeeId: string;
    hasDevice: boolean;
    manualPunchEnabled?: boolean;
}) {
    usePoll(
        1000,
        {
            only: ['records'],
        },
        {
            keepAlive: true,
        },
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="app-page-shell app-page-stack">
                <AttendanceScanner
                    records={records}
                    employeeId={employeeId}
                    hasDevice={hasDevice}
                    manualPunchEnabled={manualPunchEnabled}
                />
            </div>
        </AppLayout>
    );
}
