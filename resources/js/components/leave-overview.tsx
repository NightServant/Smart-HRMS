import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Send,
    XCircle,
} from 'lucide-react';
import { DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
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
        },
        {
            label: 'Rejected',
            value: overview.rejected,
            icon: XCircle,
            color: 'text-red-600 dark:text-red-400',
        },
        {
            label: 'Routed',
            value: overview.routed,
            icon: Send,
            color: 'text-blue-600 dark:text-blue-400',
        },
    ];

    const roleDescription = userRole === 'evaluator'
        ? 'As an evaluator, you can review and approve or return leave requests submitted by employees.'
        : 'As an HR personnel, you can review and approve or reject leave requests routed by evaluators.';

    return (
        <DashboardPanelCard
            title="Leave Overview"
            description={roleDescription}
            headerExtras={
                <Link
                    href={leaveManagementUrl}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                    View all
                    <ArrowRight className="size-3" />
                </Link>
            }
        >
            <div className="grid grid-cols-3 gap-2">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border border-brand-300 bg-white/75 px-2 py-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none"
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
            <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                <b>Total Leave Requests: {overview.total}</b>
            </div>
        </DashboardPanelCard>
    );
}
