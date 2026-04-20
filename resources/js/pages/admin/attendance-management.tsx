import { Head, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import {
    Activity,
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

export default function AttendanceManagement({
    attendances,
    search,
    pagination,
    stats,
}: {
    attendances: AttendanceRecord[];
    search: string;
    pagination: PaginationMeta;
    stats: Stats;
}) {
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['attendances', 'pagination', 'stats'] });
        }, 15000);
        return () => clearInterval(id);
    }, []);

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

                <AttendanceTable
                    attendances={attendances}
                    search={search}
                    pagination={pagination}
                />
            </div>
        </AppLayout>
    );
}
