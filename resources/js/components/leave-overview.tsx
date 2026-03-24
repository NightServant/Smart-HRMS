import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock,
    RotateCcw,
    Send,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import * as admin from '@/routes/admin';

type LeaveOverviewData = {
    pending: number;
    completed: number;
    returned: number;
    routed: number;
    total: number;
};

export default function LeaveOverview({
    data,
    userRole = 'hr',
}: {
    data?: LeaveOverviewData | null;
    userRole?: 'hr' | 'evaluator';
}) {
    const overview = data ?? {
        pending: 0,
        completed: 0,
        returned: 0,
        routed: 0,
        total: 0,
    };

    const leaveManagementUrl =
        userRole === 'evaluator'
            ? admin.leaveManagement().url
            : admin.hrLeaveManagement().url;

    const stats = [
        {
            label: 'Pending',
            value: overview.pending,
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-200 dark:border-amber-800',
        },
        {
            label: 'Approved',
            value: overview.completed,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
        {
            label: 'Returned',
            value: overview.returned,
            icon: RotateCcw,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/30',
            border: 'border-red-200 dark:border-red-800',
        },
        {
            label: 'Routed',
            value: overview.routed,
            icon: Send,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            border: 'border-blue-200 dark:border-blue-800',
        },
    ];

    return (
        <div className="flex h-full w-full min-w-0 flex-1 animate-fade-in-left flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                    <ClipboardList className="size-5 text-primary" />
                    Leave Overview
                </h1>
                <Link
                    href={leaveManagementUrl}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                    View all
                    <ArrowRight className="size-3" />
                </Link>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg border ${stat.border} ${stat.bg} px-2 py-2`}
                    >
                        <stat.icon className={`size-5 ${stat.color}`} />
                        <span className="text-lg font-bold tabular-nums">
                            {stat.value}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
