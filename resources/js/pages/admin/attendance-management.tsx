import { Head } from '@inertiajs/react';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import {
    Activity,
    CheckCircle2,
    Clock3,
    Database,
    HelpCircle,
    UserSearch,
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import {
    AttendancePolicyCard,
    type AttendancePolicy,
} from '@/components/attendance-policy-card';
import { AttendanceTable } from '@/components/attendance-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';
import PageIntro from '@/components/page-intro';

ChartJS.register(ArcElement, Tooltip, Legend);

type DailyAttendanceRow = {
    id: number;
    employee_id: string;
    employee_name: string;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'on_time' | 'late' | 'incomplete';
    late_minutes: number;
    source: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type Stats = {
    totalRecords: number;
    onTimeCount: number;
    lateCount: number;
    incompleteCount: number;
    biometricCount: number;
    manualCount: number;
    importCount: number;
    mixedCount: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Attendance Management',
        href: admin.attendanceManagement().url,
    },
];

function StatCard({
    title,
    value,
    icon: Icon,
    color,
    description,
    meta,
    footer,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    description: string;
    meta: string;
    footer?: string;
}) {
    const colorMap: Record<string, string> = {
        emerald:
            'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        zinc: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
    };
    const iconColorMap: Record<string, string> = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        zinc: 'text-zinc-600 dark:text-zinc-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold">{value}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                        {description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {meta}
                    </p>
                </div>
                <div className="rounded-lg bg-white/60 p-2 dark:bg-white/10">
                    <Icon className={`size-5 ${iconColorMap[color]}`} />
                </div>
            </div>
            {footer && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/55 px-3 py-2 text-[11px] text-muted-foreground dark:bg-white/5">
                    <Activity className="size-3.5 shrink-0" />
                    <span>{footer}</span>
                </div>
            )}
        </div>
    );
}

function shareText(value: number, total: number): string {
    if (total === 0) {
        return 'No attendance logs recorded yet.';
    }

    const percentage = Math.round((value / total) * 100);

    return `${percentage}% of all daily attendance records.`;
}

export default function AttendanceManagement({
    attendances,
    search,
    pagination,
    stats,
    attendancePolicy,
}: {
    attendances: DailyAttendanceRow[];
    search: string;
    pagination: PaginationMeta;
    stats: Stats;
    attendancePolicy: AttendancePolicy;
}) {
    const sourceData = {
        labels: ['Biometric', 'Manual', 'Import', 'Mixed'],
        datasets: [
            {
                data: [
                    stats.biometricCount,
                    stats.manualCount,
                    stats.importCount,
                    stats.mixedCount,
                ],
                backgroundColor: [
                    'rgba(147, 51, 234, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(156, 163, 175, 0.7)',
                    'rgba(20, 184, 166, 0.7)',
                ],
                borderColor: [
                    'rgb(147, 51, 234)',
                    'rgb(59, 130, 246)',
                    'rgb(156, 163, 175)',
                    'rgb(20, 184, 166)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const sourceBreakdown = [
        `Biometric ${stats.biometricCount}`,
        `Manual ${stats.manualCount}`,
        `Import ${stats.importCount}`,
        `Mixed ${stats.mixedCount}`,
    ].join(' • ');

    const dominantSource = [
        { label: 'Biometric', count: stats.biometricCount },
        { label: 'Manual', count: stats.manualCount },
        { label: 'Import', count: stats.importCount },
        { label: 'Mixed', count: stats.mixedCount },
    ].sort((a, b) => b.count - a.count)[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance Management" />
            <div className="app-page-shell app-page-stack lg:items-stretch">
                <PageIntro
                    eyebrow="HR Personnel · Attendance Management"
                    title="Daily Attendance Records"
                    description="List of all daily attendance records for the administrative office of the government."
                    className="animate-slide-in-down"
                    actions={
                        <span className="app-info-pill">
                            <UserSearch className="size-4 text-primary" />
                            {pagination.total} total records
                        </span>
                    }
                />
                <AttendancePolicyCard policy={attendancePolicy} />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard
                            title="Total Days"
                            value={stats.totalRecords}
                            icon={Database}
                            color="blue"
                            description="Daily attendance summaries"
                            meta={sourceBreakdown}
                            footer={
                                stats.totalRecords > 0
                                    ? `${dominantSource.label} is currently the dominant source for daily summaries.`
                                    : 'Daily summaries appear once attendance is captured.'
                            }
                        />
                        <StatCard
                            title="On Time"
                            value={stats.onTimeCount}
                            icon={CheckCircle2}
                            color="emerald"
                            description="Days with on-time check-in"
                            meta={shareText(
                                stats.onTimeCount,
                                stats.totalRecords,
                            )}
                            footer="Use this card to compare healthy attendance against late and incomplete days."
                        />
                        <StatCard
                            title="Late"
                            value={stats.lateCount}
                            icon={Clock3}
                            color="amber"
                            description="Late time-in incidents"
                            meta={shareText(
                                stats.lateCount,
                                stats.totalRecords,
                            )}
                            footer="Recurring late days are the quickest indicator for schedule follow-up."
                        />
                        <StatCard
                            title="Incomplete"
                            value={stats.incompleteCount}
                            icon={HelpCircle}
                            color="zinc"
                            description="Days missing time-out"
                            meta={shareText(
                                stats.incompleteCount,
                                stats.totalRecords,
                            )}
                            footer="Review these days first when reconciling attendance exceptions."
                        />
                    </div>

                    {stats.totalRecords > 0 && (
                        <div className="glass-card flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
                            <h3 className="text-center text-sm font-semibold text-muted-foreground">
                                Source Breakdown
                            </h3>
                            <div className="mt-4 flex min-h-[18rem] flex-1 items-center justify-center">
                                <Doughnut
                                    data={sourceData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '68%',
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: {
                                                    padding: 12,
                                                    usePointStyle: true,
                                                    pointStyleWidth: 8,
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <AttendanceTable
                    attendances={attendances}
                    search={search}
                    pagination={pagination}
                />
            </div>
        </AppLayout>
    );
}
