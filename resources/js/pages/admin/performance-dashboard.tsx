import { Head } from '@inertiajs/react';
import DailyAttendanceLogs from '@/components/daily-attendance-logs';
import EmployeeRemarks from '@/components/employee-remarks';
import LeaveOverview from '@/components/leave-overview';
import QuarterPerformanceTrends from '@/components/quarter-performance-trends';
import RiskEmployeeAlert from '@/components/risk-employee-alert';
import UpcomingSeminars from '@/components/upcoming-seminars';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
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

type LeaveOverviewData = {
    approved: number;
    rejected: number;
    routed: number;
    total: number;
    recentRequests: {
        id: number;
        name: string;
        leaveType: string;
        startDate: string;
        endDate: string;
        status: string;
    }[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Performance Dashboard',
        href: admin.performanceDashboard().url,
    },
];

export default function AdminPerformanceDashboard({
    seminars,
    remarks,
    leaveOverview,
}: {
    seminars: Seminar[];
    remarks?: Remark[];
    leaveOverview?: LeaveOverviewData | null;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Performance Dashboard" />
            <div className="flex w-full flex-col gap-6 p-6 xl:grid xl:grid-cols-2 xl:items-stretch">
                <QuarterPerformanceTrends />
                <RiskEmployeeAlert />
                <div className="lg:col-span-2">
                    <UpcomingSeminars seminars={seminars} />
                </div>
                <div className="grid grid-cols-1 items-stretch gap-6 xl:flex flex-row xl:col-span-2">
                    <div className='gap-6 w-full xl:w-1/2'>
                        <DailyAttendanceLogs />
                    </div>
                    <div className="flex min-h-0 flex-col gap-6 w-full xl:w-1/2">
                        <LeaveOverview data={leaveOverview} userRole='hr'/>
                        <EmployeeRemarks remarks={remarks} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
