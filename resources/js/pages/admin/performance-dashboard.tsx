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
    pending: number;
    completed: number;
    returned: number;
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

export default function AdminPerformanceDashboard({ seminars, remarks, leaveOverview }: { seminars: Seminar[]; remarks?: Remark[]; leaveOverview?: LeaveOverviewData | null }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Performance Dashboard" />
            <div className="mx-auto flex w-full flex-col gap-6 p-4 lg:grid lg:grid-cols-2 lg:items-stretch">
                <QuarterPerformanceTrends />
                <RiskEmployeeAlert />
                <UpcomingSeminars seminars={seminars} />
                <div className="col-span-2 grid max-h-[600px] grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
                    <DailyAttendanceLogs />
                    <div className="flex h-full min-h-0 flex-col gap-6">
                        <LeaveOverview data={leaveOverview} />
                        <EmployeeRemarks remarks={remarks} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
