import { Head } from '@inertiajs/react';
import DailyAttendanceLogs from '@/components/daily-attendance-logs';
import EmployeeRemarks from '@/components/employee-remarks';
import LeaveOverview from '@/components/leave-overview';
import PageIntro from '@/components/page-intro';
import {
    PerformanceDashboardStatCards,
    type PerformanceDashboardLeaveOverview,
    type PerformanceDashboardRemark,
} from '@/components/performance-dashboard-insights';
import QuarterPerformanceTrends from '@/components/quarter-performance-trends';
import RiskEmployeeAlert from '@/components/risk-employee-alert';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Performance Dashboard',
        href: admin.performanceDashboard().url,
    },
];

export default function AdminPerformanceDashboard({
    remarks,
    leaveOverview,
}: {
    remarks?: PerformanceDashboardRemark[];
    leaveOverview?: PerformanceDashboardLeaveOverview | null;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Performance Dashboard" />

            <div className="app-page-shell app-page-stack">
                <PageIntro
                    eyebrow="HR Personnel · Performance Dashboard"
                    title="HR Performance Overview"
                    description="Semestral evaluation trends, workforce risk snapshot, employee remarks, and leave management at a glance."
                />

                <PerformanceDashboardStatCards
                    remarks={remarks}
                    leaveOverview={leaveOverview}
                    userRole="hr"
                />

                <div className="grid gap-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
                        <QuarterPerformanceTrends />
                        <DailyAttendanceLogs />
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
                        <RiskEmployeeAlert />
                        <div className="grid gap-6">
                            <EmployeeRemarks remarks={remarks} />
                            <LeaveOverview
                                data={leaveOverview}
                                userRole="hr"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
