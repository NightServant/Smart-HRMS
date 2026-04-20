import { Head, router } from '@inertiajs/react';
import { useEffect } from 'react';
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
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['records'] });
        }, 15000);
        return () => clearInterval(id);
    }, []);

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
