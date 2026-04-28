import { Head, router } from '@inertiajs/react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import AttendanceScanner from '@/components/attendance-scanner';
import {
    BiometricEnrollmentDialog,
    type EnrollmentStatus,
} from '@/components/biometric-enrollment-dialog';
import { Button } from '@/components/ui/button';
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
    hasDevice,
    enrolledInBiometric = false,
    enrollmentStatus,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    hasDevice: boolean;
    enrolledInBiometric?: boolean;
    enrollmentStatus: EnrollmentStatus;
    manualPunchEnabled?: boolean;
}) {
    const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false);

    const refreshEnrollment = (): void => {
        router.reload({
            only: ['enrolledInBiometric', 'enrollmentStatus'],
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="app-page-shell app-page-stack">
                {!enrolledInBiometric ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div>
                            <p className="font-medium text-amber-900 dark:text-amber-200">
                                Your fingerprint isn&apos;t registered yet.
                            </p>
                            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
                                Register your fingerprint to begin recording
                                attendance via the biometric terminal.
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsEnrollmentDialogOpen(true)}
                        >
                            <Fingerprint className="size-4" />
                            Enroll Fingerprint
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-emerald-900 dark:text-emerald-200">
                                Biometric enrollment active.
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-emerald-800 hover:bg-emerald-100/60 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                            onClick={() => setIsEnrollmentDialogOpen(true)}
                        >
                            Manage Enrollment
                        </Button>
                    </div>
                )}
                <AttendanceScanner
                    records={records}
                    employeeId={employeeId}
                    hasDevice={hasDevice}
                    manualPunchEnabled={manualPunchEnabled}
                />
            </div>

            <BiometricEnrollmentDialog
                open={isEnrollmentDialogOpen}
                onOpenChange={setIsEnrollmentDialogOpen}
                employee={{ employee_id: employeeId, name: employeeName }}
                initialStatus={enrollmentStatus}
                onEnrolled={refreshEnrollment}
            />
        </AppLayout>
    );
}
