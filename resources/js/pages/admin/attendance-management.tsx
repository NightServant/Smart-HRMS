import { Head, usePoll } from '@inertiajs/react';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Database,
    XCircle,
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { AttendanceTable } from '@/components/attendance-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend);

type AttendanceRecord = {
    id: number;
    employee_name: string;
    date: string;
    punch_time: string;
    status: string;
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
    presentCount: number;
    lateCount: number;
    absentCount: number;
    biometricCount: number;
    manualCount: number;
    importCount: number;
};

type SyncIssue = {
    id: number;
    device_name: string;
    pin: string;
    punch_time: string;
    issue_type: string;
    message: string;
    occurred_at: string;
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
        red: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
    };
    const iconColorMap: Record<string, string> = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
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

    return `${percentage}% of all logged attendance records.`;
}

function issueLabel(issueType: string): string {
    return issueType
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function AttendanceManagement({
    attendances,
    search,
    pagination,
    stats,
    syncIssues,
}: {
    attendances: AttendanceRecord[];
    search: string;
    pagination: PaginationMeta;
    stats: Stats;
    syncIssues: SyncIssue[];
}) {
    usePoll(
        1000,
        {
            only: ['attendances', 'pagination', 'stats', 'syncIssues'],
        },
        {
            keepAlive: true,
        },
    );

    const sourceData = {
        labels: ['Biometric', 'Manual', 'Import'],
        datasets: [
            {
                data: [
                    stats.biometricCount,
                    stats.manualCount,
                    stats.importCount,
                ],
                backgroundColor: [
                    'rgba(147, 51, 234, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(156, 163, 175, 0.7)',
                ],
                borderColor: [
                    'rgb(147, 51, 234)',
                    'rgb(59, 130, 246)',
                    'rgb(156, 163, 175)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const sourceBreakdown = [
        `Biometric ${stats.biometricCount}`,
        `Manual ${stats.manualCount}`,
        `Import ${stats.importCount}`,
    ].join(' • ');

    const dominantSource = [
        { label: 'Biometric', count: stats.biometricCount },
        { label: 'Manual', count: stats.manualCount },
        { label: 'Import', count: stats.importCount },
    ].sort((a, b) => b.count - a.count)[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance Management" />
            <div className="app-page-shell app-page-stack lg:items-stretch">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard
                            title="Total Records"
                            value={stats.totalRecords}
                            icon={Database}
                            color="blue"
                            description="Combined attendance logs"
                            meta={sourceBreakdown}
                            footer={
                                stats.totalRecords > 0
                                    ? `${dominantSource.label} is currently the main source of captured logs.`
                                    : 'Upload or capture logs to populate the attendance summary.'
                            }
                        />
                        <StatCard
                            title="Present"
                            value={stats.presentCount}
                            icon={CheckCircle2}
                            color="emerald"
                            description="Verified attendance entries"
                            meta={shareText(
                                stats.presentCount,
                                stats.totalRecords,
                            )}
                            footer="Use this card to compare healthy attendance against late and absent logs."
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
                            footer="Recurring late logs are the quickest indicator for schedule follow-up."
                        />
                        <StatCard
                            title="Absent"
                            value={stats.absentCount}
                            icon={XCircle}
                            color="red"
                            description="Missing or unresolved attendance"
                            meta={shareText(
                                stats.absentCount,
                                stats.totalRecords,
                            )}
                            footer="Review these records first when reconciling attendance exceptions."
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

                <div className="glass-card rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="size-4 text-amber-500" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Live Sync Exceptions
                                </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Latest biometric records that were skipped during sync. This panel refreshes every 2 seconds.
                            </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            {syncIssues.length === 0
                                ? 'No recent sync issues'
                                : `${syncIssues.length} recent issue${syncIssues.length === 1 ? '' : 's'}`}
                        </span>
                    </div>

                    {syncIssues.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                            All recent biometric punches have synced successfully.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {syncIssues.map((issue) => (
                                <div
                                    key={issue.id}
                                    className="rounded-lg border border-border/80 bg-background/70 p-3"
                                >
                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-950/40 dark:text-amber-200">
                                                    {issueLabel(issue.issue_type)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Device: {issue.device_name}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-foreground">
                                                {issue.message}
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span>PIN: {issue.pin}</span>
                                                <span>Punch: {issue.punch_time}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {issue.occurred_at}
                                        </span>
                                    </div>
                                </div>
                            ))}
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
