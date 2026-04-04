import { Head } from '@inertiajs/react';
import {
    BarChart3,
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    LeaveDetailDialog,
    type LeaveRequestDetail,
} from '@/components/leave-detail-dialog';
import LeaveRequestForm from '@/components/leave-request-form';
import PageIntro from '@/components/page-intro';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { leaveApplication } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Leave Application',
        href: leaveApplication().url,
    },
];

function formatLeaveType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLeaveAccrual(value: number | null): string {
    return value != null ? value.toFixed(2) : '—';
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { label: string; className: string }> = {
        completed: {
            label: 'Approved',
            className:
                'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800',
        },
        returned: {
            label: 'Rejected',
            className:
                'bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800',
        },
        routed: {
            label: 'In Review',
            className:
                'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800',
        },
        pending: {
            label: 'Pending',
            className:
                'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800',
        },
    };

    const { label, className } = variants[status] ?? variants.pending;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
        >
            {label}
        </span>
    );
}

function StatCard({
    title,
    value,
    caption,
    icon: Icon,
    accentClassName,
}: {
    title: string;
    value: number;
    caption: string;
    icon: React.ElementType;
    accentClassName: string;
}) {
    return (
        <Card className="glass-card border-primary/15 bg-card/90 shadow-sm backdrop-blur-xl">
            <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {value}
                    </p>
                    <p className="text-sm text-muted-foreground">{caption}</p>
                </div>
                <div className={`rounded-2xl p-3 ${accentClassName}`}>
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function LeaveApplication({
    leaveHistory = [],
}: {
    leaveHistory?: LeaveRequestDetail[];
}) {
    const [selectedLeave, setSelectedLeave] =
        useState<LeaveRequestDetail | null>(null);
    const leaveStats = useMemo(() => {
        const totalRequests = leaveHistory.length;
        const inReviewCount = leaveHistory.filter(({ status }) =>
            ['pending', 'routed'].includes(status),
        ).length;
        const approvedCount = leaveHistory.filter(
            ({ status }) => status === 'completed',
        ).length;
        const rejectedCount = leaveHistory.filter(
            ({ status }) => status === 'returned',
        ).length;

        return {
            totalRequests,
            inReviewCount,
            approvedCount,
            rejectedCount,
        };
    }, [leaveHistory]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave Application" />
            <div className="app-page-shell app-page-stack pb-10">
                <PageIntro
                    eyebrow="Employee · Leave Application"
                    title="Plan, submit, and monitor leave requests"
                    description="Review your leave activity, file a request with the right supporting details, and track routing progress from evaluator to HR."
                />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Requests"
                        value={leaveStats.totalRequests}
                        caption="All submitted leave applications"
                        icon={BarChart3}
                        accentClassName="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                    />
                    <StatCard
                        title="In Review"
                        value={leaveStats.inReviewCount}
                        caption="Pending evaluator or HR action"
                        icon={Clock3}
                        accentClassName="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    />
                    <StatCard
                        title="Approved"
                        value={leaveStats.approvedCount}
                        caption="Requests completed successfully"
                        icon={CheckCircle2}
                        accentClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    />
                    <StatCard
                        title="Rejected"
                        value={leaveStats.rejectedCount}
                        caption="Returned requests needing revision"
                        icon={XCircle}
                        accentClassName="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    />
                </div>

                <div className="flex flex-col items-stretch gap-6">
                    <div className="min-w-0 xl:flex-1">
                        <LeaveRequestForm />
                    </div>
                    {/* Leave History Table */}
                    <Card className="glass-card min-w-0 max-w-none animate-fade-in-up border-primary/20 bg-card shadow-sm transition-shadow hover:shadow-md xl:flex-1">
                        <CardHeader className="space-y-2">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="size-5 text-primary" />
                                My Leave Records
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Review the status and routing progress of your
                                recent leave requests.
                            </p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="space-y-3 px-4 pb-4 md:hidden">
                                {leaveHistory.length === 0 ? (
                                    <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground">
                                        No leave records found. Submit your first request above.
                                    </div>
                                ) : (
                                    leaveHistory.map((lr) => (
                                        <div
                                            key={lr.id}
                                            className="glass-card rounded-2xl border border-border/70 bg-background/40 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-2">
                                                    <StatusBadge status={lr.status} />
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {formatLeaveType(lr.leaveType)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Filed {lr.createdAt ?? '—'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="shrink-0 border-[#2F5E2B]/30 bg-white/60 text-[#2F5E2B] hover:bg-[#2F5E2B] hover:text-white dark:border-[#4A7C3C]/50 dark:bg-transparent dark:text-[#7DC46B] dark:hover:bg-[#2F5E2B] dark:hover:text-white"
                                                    onClick={() => setSelectedLeave(lr)}
                                                >
                                                    <Eye className="size-3.5" />
                                                    View
                                                </Button>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Date From
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {lr.startDate}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Date To
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {lr.endDate}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Days
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {formatLeaveAccrual(lr.leaveAccrual)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                            <TableHead className="px-4 py-3">
                                                Status
                                            </TableHead>
                                            <TableHead className="px-4 py-3">
                                                Filing Date
                                            </TableHead>
                                            <TableHead className="px-4 py-3">
                                                Leave Type
                                            </TableHead>
                                            <TableHead className="px-4 py-3">
                                                Date From
                                            </TableHead>
                                            <TableHead className="px-4 py-3">
                                                Date To
                                            </TableHead>
                                            <TableHead className="px-4 py-3 text-center">
                                                Days
                                            </TableHead>
                                            <TableHead className="px-4 py-3 text-center">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaveHistory.map((lr, index) => (
                                            <TableRow
                                                key={lr.id}
                                                style={{
                                                    animationDelay: `${index * 24}ms`,
                                                }}
                                                className={`animate-fade-in-up text-sm font-medium text-foreground ${
                                                    index % 2 === 0
                                                        ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80'
                                                        : 'bg-[#BFDDB5] dark:bg-[#274827]/80'
                                                }`}
                                            >
                                                <TableCell className="px-4 py-3">
                                                    <StatusBadge
                                                        status={lr.status}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm">
                                                    {lr.createdAt ?? '—'}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 font-semibold">
                                                    {formatLeaveType(
                                                        lr.leaveType,
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm">
                                                    {lr.startDate}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm">
                                                    {lr.endDate}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-center text-sm">
                                                    {formatLeaveAccrual(
                                                        lr.leaveAccrual,
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full gap-1.5 border-[#2F5E2B]/30 bg-white/60 text-[#2F5E2B] hover:bg-[#2F5E2B] hover:text-white sm:w-auto dark:border-[#4A7C3C]/50 dark:bg-transparent dark:text-[#7DC46B] dark:hover:bg-[#2F5E2B] dark:hover:text-white"
                                                        onClick={() =>
                                                            setSelectedLeave(lr)
                                                        }
                                                    >
                                                        <Eye className="size-3.5" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {leaveHistory.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="bg-[#DDEFD7] px-4 py-8 text-center text-muted-foreground dark:bg-[#345A34]/80"
                                                >
                                                    No leave records found.
                                                    Submit your first request
                                                    above.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <LeaveDetailDialog
                leave={selectedLeave}
                role="employee"
                onClose={() => setSelectedLeave(null)}
            />
        </AppLayout>
    );
}
