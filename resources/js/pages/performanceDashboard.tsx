import { Head } from '@inertiajs/react';
import DailyAttendanceLogs from '@/components/daily-attendance-logs';
import EmployeeRemarks from '@/components/employee-remarks';
import QuarterPerformanceTrends from '@/components/quarter-performance-trends';
import RiskEmployeeAlert from '@/components/risk-employee-alert';
import UpcomingSeminars from '@/components/upcoming-seminars';
import AppLayout from '@/layouts/app-layout';
import { performanceDashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Seminar = {
    id: number;
    title: string;
    description: string;
    location: string;
    time: string;
    speaker: string;
    target_performance_area: string;
    date: string;
};

type Remark = {
    employeeId: string;
    employeeName: string;
    date: string;
    remark: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Performance Dashboard',
        href: performanceDashboard().url,
    },
];

export default function PerformanceDashboard({ seminars, remarks }: { seminars: Seminar[]; remarks?: Remark[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Performance Dashboard" />
            <div className="p-4 mx-auto flex w-full flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-stretch">
                <QuarterPerformanceTrends />
                <RiskEmployeeAlert />
                <UpcomingSeminars seminars={seminars} />
                <DailyAttendanceLogs />
                <EmployeeRemarks remarks={remarks} />
            </div>
        </AppLayout>
    );
}
