import { Head, Link } from '@inertiajs/react';
import AttendanceScanner from '@/components/attendance-scanner';
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
    hasDevice,
    enrolledInBiometric = false,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    hasDevice: boolean;
    enrolledInBiometric?: boolean;
    manualPunchEnabled?: boolean;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="app-page-shell app-page-stack">
                {!enrolledInBiometric && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="font-medium text-amber-900 dark:text-amber-200">
                            Your fingerprint isn&apos;t registered yet.
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
                            <Link
                                href="/biometric-enrollment"
                                className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                            >
                                Register your fingerprint
                            </Link>{' '}
                            to begin recording attendance via the biometric
                            terminal.
                        </p>
                    </div>
                )}
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
