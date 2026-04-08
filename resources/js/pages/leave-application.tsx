import { Head } from '@inertiajs/react';
import {
    BarChart3,
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    Wallet,
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
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { leaveApplication } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type LeaveCreditItem = {
    value: string;
    label: string;
    creditDisplay: string;
};

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
    return value != null ? (value / 1.25).toFixed(2) : '—';
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

function LeaveCreditsPanel({
    leaveCreditsByType,
    vlCredits,
    slCredits,
}: {
    leaveCreditsByType: LeaveCreditItem[];
    vlCredits: number;
    slCredits: number;
}) {
    return (
        <Card className="glass-card min-w-0 max-w-none animate-fade-in-up border-primary/20 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="size-5 text-primary" />
                    Leave Credits
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Review your current balances before filing a leave request.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                            Vacation Leave
                        </p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            {vlCredits.toFixed(2)} days
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Credits available for VL and force leave deductions.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                            Sick Leave
                        </p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            {slCredits.toFixed(2)} days
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Credits available for sick leave deductions.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {leaveCreditsByType.map((leaveCredit) => (
                        <div
                            key={leaveCredit.value}
                            className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                        >
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                {leaveCredit.label}
                            </p>
                            <p className="mt-2 text-xl font-bold text-foreground">
                                {leaveCredit.creditDisplay}
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function LeaveApplication({
    leaveHistory = [],
    vlCredits = 0,
    slCredits = 0,
    leaveCreditsByType = [],
    holidays = [],
}: {
    leaveHistory?: LeaveRequestDetail[];
    vlCredits?: number;
    slCredits?: number;
    leaveCreditsByType?: LeaveCreditItem[];
    holidays?: string[];
}) {
    const [selectedLeave, setSelectedLeave] =
        useState<LeaveRequestDetail | null>(null);
    const [recordsPage, setRecordsPage] = useState(1);
    const recordsPerPage = 8;
    const totalRecordPages = Math.max(
        1,
        Math.ceil(leaveHistory.length / recordsPerPage),
    );
    const activeRecordsPage = Math.min(recordsPage, totalRecordPages);
    const paginatedLeaveHistory = useMemo(() => {
        const startIndex = (activeRecordsPage - 1) * recordsPerPage;

        return leaveHistory.slice(startIndex, startIndex + recordsPerPage);
    }, [activeRecordsPage, leaveHistory]);
    const recordsStart = leaveHistory.length === 0
        ? 0
        : (activeRecordsPage - 1) * recordsPerPage + 1;
    const recordsEnd = Math.min(
        leaveHistory.length,
        activeRecordsPage * recordsPerPage,
    );

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
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 space-y-6">
                        <Tabs defaultValue="apply" className="w-full">
                            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-transparent p-0 sm:grid-cols-3">
                                <TabsTrigger
                                    value="apply"
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm font-semibold data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10"
                                >
                                    Apply for Leave
                                </TabsTrigger>
                                <TabsTrigger
                                    value="records"
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm font-semibold data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10"
                                >
                                    My Leave Records
                                </TabsTrigger>
                                <TabsTrigger
                                    value="credits"
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm font-semibold data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10"
                                >
                                    Leave Credits
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="apply" className="mt-5">
                                <div className="min-w-0">
                                    <LeaveRequestForm
                                        vlCredits={vlCredits}
                                        slCredits={slCredits}
                                        leaveCreditsByType={leaveCreditsByType}
                                        holidays={holidays}
                                        showLeaveCreditsSummary={false}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="records" className="mt-5">
                                <Card className="glass-card min-w-0 max-w-none animate-fade-in-up border-primary/20 bg-card shadow-sm transition-shadow hover:shadow-md">
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
                                            {paginatedLeaveHistory.length === 0 ? (
                                                <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground">
                                                    No leave records found. Submit your first request above.
                                                </div>
                                            ) : (
                                                paginatedLeaveHistory.map((lr) => (
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
                                                                    Days of Leave
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
                                                            Days of Leave
                                                        </TableHead>
                                                        <TableHead className="px-4 py-3 text-center">
                                                            Action
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedLeaveHistory.map((lr, index) => (
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
                                                    {paginatedLeaveHistory.length === 0 && (
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

                                        <div className="border-t border-border/70 bg-background/40 px-4 py-4">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing{' '}
                                                    {leaveHistory.length === 0
                                                        ? '0'
                                                        : `${recordsStart}-${recordsEnd}`}{' '}
                                                    of {leaveHistory.length} leave request
                                                    {leaveHistory.length === 1 ? '' : 's'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                                                    <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground">
                                                        Page {activeRecordsPage} of {totalRecordPages}
                                                    </span>
                                                    <Pagination className="w-auto justify-end">
                                                        <PaginationContent className="gap-2">
                                                            <PaginationItem>
                                                                <PaginationPrevious
                                                                    href="#"
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        if (activeRecordsPage > 1) {
                                                                            setRecordsPage(activeRecordsPage - 1);
                                                                        }
                                                                    }}
                                                                    className={
                                                                        activeRecordsPage === 1
                                                                            ? 'pointer-events-none opacity-50'
                                                                            : ''
                                                                    }
                                                                />
                                                            </PaginationItem>
                                                            <PaginationItem>
                                                                <PaginationNext
                                                                    href="#"
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        if (activeRecordsPage < totalRecordPages) {
                                                                            setRecordsPage(activeRecordsPage + 1);
                                                                        }
                                                                    }}
                                                                    className={
                                                                        activeRecordsPage === totalRecordPages
                                                                            ? 'pointer-events-none opacity-50'
                                                                            : ''
                                                                    }
                                                                />
                                                            </PaginationItem>
                                                        </PaginationContent>
                                                    </Pagination>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="credits" className="mt-5">
                                <LeaveCreditsPanel
                                    leaveCreditsByType={leaveCreditsByType}
                                    vlCredits={vlCredits}
                                    slCredits={slCredits}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
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
