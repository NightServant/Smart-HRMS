import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Send,
    XCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import * as admin from '@/routes/admin';

type LeaveOverviewData = {
    approved: number;
    rejected: number;
    routed: number;
    total: number;
};

export default function LeaveOverview({
    data,
    userRole,
}: {
    data?: LeaveOverviewData | null;
    userRole: 'hr' | 'evaluator';
}) {
    const overview = data ?? {
        approved: 0,
        rejected: 0,
        routed: 0,
        total: 0,
    };

    const leaveManagementUrl =
        userRole === 'evaluator'
            ? admin.leaveManagement().url
            : admin.hrLeaveManagement().url;

    const stats = [
        {
            label: 'Approved',
            value: overview.approved,
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
        {
            label: 'Rejected',
            value: overview.rejected,
            icon: XCircle,
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
        <div className="glass-card flex h-full w-full min-w-0 flex-1 animate-fade-in-left flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
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
            <div className="grid grid-cols-3 gap-2">
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
            <Separator />
                <div className="text-sm text-muted-foreground">
                    <b>Total Leave Requests: {overview.total}</b>
                    <br />
                    {userRole === 'evaluator'
                        ? 'As an evaluator, you can review and approve or return leave requests submitted by employees.'
                        : 'As an HR personnel, you can review and approve or reject leave requests routed by evaluators.'}
                </div>
        </div>
    );
}
