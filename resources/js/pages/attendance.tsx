import { Head } from '@inertiajs/react';
import AttendanceScanner from '@/components/attendance-scanner';
import { type EnrollmentStatus } from '@/components/biometric-enrollment-dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DailyAttendanceRecord = {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'on_time' | 'late' | 'incomplete';
    late_minutes: number;
    source: string;
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
    employeeName,
    enrolledInBiometric = false,
    enrollmentStatus,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    enrolledInBiometric?: boolean;
    enrollmentStatus: EnrollmentStatus;
    manualPunchEnabled?: boolean;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="app-page-shell app-page-stack">
                <AttendanceScanner
                    records={records}
                    employeeId={employeeId}
                    employeeName={employeeName}
                    enrolledInBiometric={enrolledInBiometric}
                    enrollmentStatus={enrollmentStatus}
                    manualPunchEnabled={manualPunchEnabled}
                />
            </div>
        </AppLayout>
    );
}
