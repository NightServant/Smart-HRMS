import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    GraduationCap,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { AdminReportsPeriodSelector } from '@/components/admin-reports-period-selector';
import {
    DashboardChartSurface,
    DashboardMetricCard,
    DashboardPanelCard,
    DashboardStatChipGrid,
} from '@/components/admin-system-dashboard-cards';
import {
    AdminDashboardBarChart,
    AdminDashboardDoughnutChart,
} from '@/components/admin-system-dashboard-charts';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types/navigation';

type Props = {
    period: string;
    dateFrom: string;
    dateTo: string;
    attendance: {
        totalRecords: number;
        presentCount: number;
        lateCount: number;
        onTimeRate: number;
    };
    leave: {
        total: number;
        approved: number;
        rejected: number;
        routed: number;
        byType: { type: string; total: number }[];
    };
    performance: {
        completedIpcr: number;
        avgRating: number;
        ratingDistribution: { label: string; count: number }[];
    };
    iwr: {
        totalEvents: number;
        complianceRate: number;
        avgConfidence: number;
        lowConfidence: number;
        complianceBreakdown: { label: string; count: number }[];
    };
    training: {
        seminarCount: number;
        topArea: string;
        byArea: { area: string; total: number }[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reports',
        href: admin.reports().url,
    },
];

const LEAVE_TYPE_COLORS = [
    '#4A7C3C',
    '#C89C3D',
    '#2196F3',
    '#FF5722',
    '#9C27B0',
    '#009688',
    '#E91E63',
    '#607D8B',
];

const RATING_COLORS = ['#4A7C3C', '#66BB6A', '#C89C3D', '#FF9800', '#FF5722'];

export default function ReportsDashboard(props: Props) {
    const { attendance, leave, performance, iwr, training } = props;

    // Leave type doughnut data
    const leaveTypeLabels = leave.byType.map((item) => item.type);
    const leaveTypeData = leave.byType.map((item) => item.total);
    const leaveTypeBg = leave.byType.map(
        (_, i) => LEAVE_TYPE_COLORS[i % LEAVE_TYPE_COLORS.length],
    );
    const leaveTypeBorder = leaveTypeBg;

    // IWR compliance doughnut data
    const iwrLabels = iwr.complianceBreakdown.map((item) => item.label);
    const iwrData = iwr.complianceBreakdown.map((item) => item.count);
    const iwrBg = ['#4A7C3C', '#FF0056'];
    const iwrBorder = iwrBg;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="app-page-shell flex w-full flex-col gap-5">
                <AdminReportsPeriodSelector
                    period={props.period}
                    dateFrom={props.dateFrom}
                    dateTo={props.dateTo}
                />

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <DashboardMetricCard
                        title="Attendance Rate"
                        description="On-time percentage"
                        value={`${attendance.onTimeRate}%`}
                        meta={`${attendance.totalRecords} total records`}
                        icon={CheckCircle2}
                    />
                    <DashboardMetricCard
                        title="Leave Requests"
                        description="Total submissions"
                        value={leave.total}
                        meta={`Approved: ${leave.approved} | Rejected: ${leave.rejected}`}
                        icon={CalendarDays}
                    />
                    <DashboardMetricCard
                        title="Avg Performance"
                        description="IPCR rating"
                        value={performance.avgRating}
                        meta={`${performance.completedIpcr} evaluations completed`}
                        icon={TrendingUp}
                    />
                    <DashboardMetricCard
                        title="Training Sessions"
                        description="Seminars conducted"
                        value={training.seminarCount}
                        meta={`${training.topArea} leading focus`}
                        icon={GraduationCap}
                    />
                    <DashboardMetricCard
                        title="IWR Compliance"
                        description="Pass rate"
                        value={`${iwr.complianceRate}%`}
                        meta={`${iwr.lowConfidence} low confidence events`}
                        icon={ShieldCheck}
                    />
                </div>

                {/* Chart Row 1 */}
                <div className="grid gap-4 xl:grid-cols-12">
                    <DashboardPanelCard
                        title="Attendance Summary"
                        description="Present vs late attendance records for the selected period."
                        className="xl:col-span-7"
                        accentClassName="inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-500/10 to-transparent"
                        headerExtras={
                            <Badge
                                variant="outline"
                                className="w-fit border-brand-300 text-brand-700 dark:border-brand-700 dark:text-brand-400"
                            >
                                {attendance.totalRecords} total records
                            </Badge>
                        }
                    >
                        <DashboardChartSurface>
                            <AdminDashboardBarChart
                                labels={['Present', 'Late']}
                                datasets={[
                                    {
                                        label: 'Count',
                                        data: [
                                            attendance.presentCount,
                                            attendance.lateCount,
                                        ],
                                        backgroundColor: '#4A7C3C',
                                        borderColor: '#4A7C3C',
                                    },
                                ]}
                            />
                        </DashboardChartSurface>
                    </DashboardPanelCard>

                    <DashboardPanelCard
                        title="Leave Type Distribution"
                        description="Breakdown of leave requests by type."
                        className="xl:col-span-5"
                    >
                        <DashboardChartSurface>
                            <AdminDashboardDoughnutChart
                                labels={leaveTypeLabels}
                                data={leaveTypeData}
                                backgroundColor={leaveTypeBg}
                                borderColor={leaveTypeBorder}
                            />
                        </DashboardChartSurface>
                        <DashboardStatChipGrid
                            items={leave.byType.map((item, i) => ({
                                color: LEAVE_TYPE_COLORS[
                                    i % LEAVE_TYPE_COLORS.length
                                ],
                                label: item.type,
                                value: item.total,
                            }))}
                        />
                    </DashboardPanelCard>
                </div>

                {/* Chart Row 2 */}
                <div className="grid gap-4 xl:grid-cols-12">
                    <DashboardPanelCard
                        title="Performance Rating Distribution"
                        description="Distribution of IPCR performance ratings."
                        className="xl:col-span-7"
                        headerExtras={
                            <Badge
                                variant="outline"
                                className="w-fit border-brand-300 text-brand-700 dark:border-brand-700 dark:text-brand-400"
                            >
                                Average: {performance.avgRating}
                            </Badge>
                        }
                    >
                        <DashboardChartSurface>
                            <AdminDashboardBarChart
                                labels={performance.ratingDistribution.map(
                                    (item) => item.label,
                                )}
                                datasets={[
                                    {
                                        label: 'Count',
                                        data: performance.ratingDistribution.map(
                                            (item) => item.count,
                                        ),
                                        backgroundColor: '#4A7C3C',
                                        borderColor: '#4A7C3C',
                                    },
                                ]}
                                indexAxis="y"
                            />
                        </DashboardChartSurface>
                    </DashboardPanelCard>

                    <DashboardPanelCard
                        title="IWR Compliance Breakdown"
                        description="Pass/fail distribution and confidence metrics."
                        className="xl:col-span-5"
                    >
                        <DashboardChartSurface>
                            <AdminDashboardDoughnutChart
                                labels={iwrLabels}
                                data={iwrData}
                                backgroundColor={iwrBg}
                                borderColor={iwrBorder}
                            />
                        </DashboardChartSurface>
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-2xl border border-brand-300 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <p className="text-xs text-muted-foreground">
                                    Compliance Rate
                                </p>
                                <p className="text-lg font-bold">
                                    {iwr.complianceRate}%
                                </p>
                            </div>
                            <div className="rounded-2xl border border-brand-300 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <p className="text-xs text-muted-foreground">
                                    Avg Confidence
                                </p>
                                <p className="text-lg font-bold">
                                    {iwr.avgConfidence}%
                                </p>
                            </div>
                            <div className="rounded-2xl border border-brand-300 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <p className="text-xs text-muted-foreground">
                                    Low Confidence
                                </p>
                                <p className="text-lg font-bold">
                                    {iwr.lowConfidence}
                                </p>
                            </div>
                        </div>
                    </DashboardPanelCard>
                </div>

                {/* Chart Row 3 */}
                <div className="grid gap-4 xl:grid-cols-12">
                    <DashboardPanelCard
                        title="Training Focus Areas"
                        description="Seminars conducted by training focus area."
                        className="xl:col-span-7"
                    >
                        <DashboardChartSurface>
                            <AdminDashboardBarChart
                                labels={training.byArea.map(
                                    (item) => item.area,
                                )}
                                datasets={[
                                    {
                                        label: 'Seminars',
                                        data: training.byArea.map(
                                            (item) => item.total,
                                        ),
                                        backgroundColor: '#009688',
                                        borderColor: '#009688',
                                    },
                                ]}
                                indexAxis="y"
                            />
                        </DashboardChartSurface>
                    </DashboardPanelCard>

                    <DashboardPanelCard
                        title="Leave Request Status"
                        description="Approved, routed, and rejected leave requests."
                        className="xl:col-span-5"
                    >
                        <DashboardChartSurface>
                            <AdminDashboardBarChart
                                labels={['Approved', 'Routed', 'Rejected']}
                                datasets={[
                                    {
                                        label: 'Approved',
                                        data: [leave.approved, 0, 0],
                                        backgroundColor: '#4A7C3C',
                                        borderColor: '#4A7C3C',
                                    },
                                    {
                                        label: 'Routed',
                                        data: [0, leave.routed, 0],
                                        backgroundColor: '#C89C3D',
                                        borderColor: '#C89C3D',
                                    },
                                    {
                                        label: 'Rejected',
                                        data: [0, 0, leave.rejected],
                                        backgroundColor: '#FF0056',
                                        borderColor: '#FF0056',
                                    },
                                ]}
                            />
                        </DashboardChartSurface>
                    </DashboardPanelCard>
                </div>
            </div>
        </AppLayout>
    );
}
