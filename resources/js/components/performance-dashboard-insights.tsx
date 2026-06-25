import {
    ArrowUpRight,
    CheckCircle2,
    ClipboardList,
    FileText,
    Inbox,
    MessageSquareQuote,
    Sparkles,
    XCircle,
} from 'lucide-react';
import {
    DashboardMetricCard,
    DashboardPanelCard,
    DashboardStatChipGrid,
} from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';

export type PerformanceDashboardRemark = {
    employeeId: string;
    employeeName: string;
    date: string;
    remark: string;
};

export type PerformanceDashboardLeaveOverview = {
    approved: number;
    rejected: number;
    routed: number;
    total: number;
    recentRequests?: {
        id: number;
        name: string;
        leaveType: string;
        startDate: string;
        endDate: string;
        status: string;
    }[];
};

function formatLeaveType(value: string): string {
    return value
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function PerformanceDashboardStatCards({
    remarks = [],
    leaveOverview,
    userRole,
}: {
    remarks?: PerformanceDashboardRemark[];
    leaveOverview?: PerformanceDashboardLeaveOverview | null;
    userRole: 'evaluator' | 'hr';
}) {
    const overview = leaveOverview ?? {
        approved: 0,
        rejected: 0,
        routed: 0,
        total: 0,
    };

    const uniqueEmployeeCount = new Set(
        remarks.map((remark) => remark.employeeId),
    ).size;
    const approvalRate =
        overview.total > 0
            ? Math.round((overview.approved / overview.total) * 100)
            : 0;

    const cards =
        userRole === 'evaluator'
            ? [
                  {
                      title: 'Remark Feed',
                      description: 'Recent evaluator notes',
                      value: remarks.length,
                      meta: `${uniqueEmployeeCount} employee(s) with feedback`,
                      icon: MessageSquareQuote,
                  },
                  {
                      title: 'Leave Queue',
                      description: 'Requests waiting on you',
                      value: overview.routed,
                      meta: `${overview.total} total tracked leave requests`,
                      icon: Inbox,
                  },
                  {
                      title: 'Approved',
                      description: 'Requests moved forward',
                      value: overview.approved,
                      meta: `${approvalRate}% approval rate`,
                      icon: CheckCircle2,
                  },
                  {
                      title: 'Returned',
                      description: 'Requests needing revision',
                      value: overview.rejected,
                      meta: 'Follow up with employees needing changes',
                      icon: XCircle,
                  },
              ]
            : [
                  {
                      title: 'Recent Remarks',
                      description: 'Feedback reaching HR',
                      value: remarks.length,
                      meta: `${uniqueEmployeeCount} employee(s) represented`,
                      icon: FileText,
                  },
                  {
                      title: 'Pending HR Review',
                      description: 'Requests awaiting HR action',
                      value: overview.routed,
                      meta: `${overview.total} leave requests in scope`,
                      icon: ClipboardList,
                  },
                  {
                      title: 'Fully Approved',
                      description: 'Requests completed by HR',
                      value: overview.approved,
                      meta: `${approvalRate}% approval rate`,
                      icon: CheckCircle2,
                  },
                  {
                      title: 'Rejected by HR',
                      description: 'Requests sent back or denied',
                      value: overview.rejected,
                      meta: 'Use this to spot repeated policy issues',
                      icon: XCircle,
                  },
              ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <DashboardMetricCard
                    key={card.title}
                    title={card.title}
                    description={card.description}
                    value={card.value}
                    meta={card.meta}
                    icon={card.icon}
                />
            ))}
        </div>
    );
}

export function PerformanceDashboardInsightPanel({
    remarks = [],
    leaveOverview,
    userRole,
}: {
    remarks?: PerformanceDashboardRemark[];
    leaveOverview?: PerformanceDashboardLeaveOverview | null;
    userRole: 'evaluator' | 'hr';
}) {
    const overview = leaveOverview ?? {
        approved: 0,
        rejected: 0,
        routed: 0,
        total: 0,
        recentRequests: [],
    };

    const latestRemark = remarks[0];
    const latestRequest = overview.recentRequests?.[0];
    const uniqueEmployeeCount = new Set(
        remarks.map((remark) => remark.employeeId),
    ).size;
    const approvalRate =
        overview.total > 0
            ? Math.round((overview.approved / overview.total) * 100)
            : 0;

    const description =
        userRole === 'evaluator'
            ? 'Stay on top of evaluator actions by balancing feedback volume with pending leave decisions and recent workflow movement.'
            : 'Track the HR review load, recent evaluator feedback, and the leave requests most likely to need immediate attention.';

    const highlight =
        overview.routed > 0
            ? userRole === 'evaluator'
                ? `${overview.routed} leave request(s) still need evaluator action.`
                : `${overview.routed} leave request(s) are waiting for HR review.`
            : remarks.length > 0
              ? 'Leave routing is under control, so the next best focus is recent feedback and coaching notes.'
              : 'No immediate workflow pressure detected right now. Use this space as your quick operational pulse.';

    return (
        <DashboardPanelCard
            title="Workflow Focus"
            description={description}
            accentClassName="right-0 top-8 size-32 rounded-full bg-complement-sky-300/20 blur-3xl dark:bg-complement-sky-500/10"
            headerExtras={
                <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/8 text-primary"
                >
                    <Sparkles className="mr-1 size-3.5" />
                    Approval rate {approvalRate}%
                </Badge>
            }
        >
            <div className="rounded-[1.35rem] border border-brand-300 bg-white/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                <p className="font-medium text-foreground">{highlight}</p>
            </div>

            <DashboardStatChipGrid
                items={[
                    {
                        color: '#4A7C3C',
                        label: 'Remark Feed',
                        value: remarks.length,
                    },
                    {
                        color: '#5B8FAE',
                        label:
                            userRole === 'evaluator'
                                ? 'Pending Evaluator Queue'
                                : 'Pending HR Queue',
                        value: overview.routed,
                    },
                    {
                        color: '#C89C3D',
                        label: 'Employees Covered',
                        value: uniqueEmployeeCount,
                    },
                ]}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            Latest Remark
                        </p>
                        <MessageSquareQuote className="size-4 text-primary" />
                    </div>
                    {latestRemark ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">
                                {latestRemark.employeeName ||
                                    latestRemark.employeeId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {latestRemark.date}
                            </p>
                            <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                                {latestRemark.remark}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm leading-6 text-muted-foreground">
                            No recent remarks available yet.
                        </p>
                    )}
                </div>

                <div className="rounded-[1.35rem] border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            Most Recent Leave Request
                        </p>
                        <ArrowUpRight className="size-4 text-primary" />
                    </div>
                    {latestRequest ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">
                                {latestRequest.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatLeaveType(latestRequest.leaveType)}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {latestRequest.startDate} -{' '}
                                {latestRequest.endDate}
                            </p>
                            <Badge
                                variant="outline"
                                className="border-border/70 bg-background/70"
                            >
                                {latestRequest.status}
                            </Badge>
                        </div>
                    ) : (
                        <p className="text-sm leading-6 text-muted-foreground">
                            No recent leave request activity is available.
                        </p>
                    )}
                </div>
            </div>
        </DashboardPanelCard>
    );
}
