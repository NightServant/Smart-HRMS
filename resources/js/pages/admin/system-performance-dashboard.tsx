import { Head } from '@inertiajs/react';
import { Activity, Archive, CheckCircle2, ShieldAlert, Users, Workflow } from 'lucide-react';
import type { ReactNode } from 'react';
import { AdminDashboardBarChart, AdminDashboardDoughnutChart } from '@/components/admin-system-dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type DashboardProps = {
    accountMetrics: {
        total: number;
        active: number;
        inactive: number;
        twoFactorEnabled: number;
        byRole: {
            administrators: number;
            hrPersonnel: number;
            evaluators: number;
            employees: number;
        };
    };
    workflowMetrics: {
        leave: {
            total: number;
            routed: number;
            completed: number;
            returned: number;
            pendingReason: number;
        };
        ipcr: {
            total: number;
            routed: number;
            completed: number;
            returned: number;
            pendingEvaluation: number;
        };
    };
    auditMetrics: {
        totalEvents: number;
        leaveEvents: number;
        ipcrEvents: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        failedComplianceCount: number;
        routingActions: {
            action: string;
            total: number;
        }[];
    };
    trainingMetrics: {
        scheduledCount: number;
        targetAreas: {
            area: string;
            total: number;
        }[];
    };
    recentAuditLogs: {
        id: number;
        loggedAt: string;
        employeeName: string;
        employeeId: string;
        documentType: string;
        routingAction: string;
        confidencePct: number | null;
        compliancePassed: boolean;
    }[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'System Dashboard',
        href: admin.systemDashboard().url,
    },
];

type DashboardLegendItem = {
    color: string;
    label: string;
    value: string | number;
};

function DashboardLegend({
    items,
    className,
}: {
    items: DashboardLegendItem[];
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2 sm:flex sm:flex-wrap', className)}>
            {items.map((item) => (
                <div
                    key={item.label}
                    className="inline-flex min-w-0 w-full items-center justify-between gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur-md sm:w-auto sm:justify-start dark:border-white/10 dark:bg-white/[0.06]"
                >
                    <span className="size-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.45)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" style={{ backgroundColor: item.color }} />
                    <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                    <span className="shrink-0 text-muted-foreground">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

function DashboardChartSurface({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative min-w-0 overflow-hidden rounded-[26px] border border-white/60 bg-gradient-to-br from-white via-white/90 to-brand-100/45 p-3 shadow-[0_18px_40px_-28px_rgba(31,41,55,0.6)] backdrop-blur-md sm:p-4 dark:border-white/10 dark:from-white/[0.06] dark:via-white/5 dark:to-brand-500/10',
                className,
            )}
        >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-500/10" />
            <div className="pointer-events-none absolute bottom-0 right-0 size-28 rounded-full bg-complement-sky-300/30 blur-3xl dark:bg-complement-sky-500/10" />
            <div className="relative">{children}</div>
        </div>
    );
}

function formatActionLabel(label: string): string {
    return label
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function wrapChartLabel(label: string, maxLineLength = 18): string | string[] {
    const words = label.split(' ');

    if (words.length <= 1 && label.length <= maxLineLength) {
        return label;
    }

    const lines = words.reduce<string[]>((wrappedLines, word) => {
        const currentLine = wrappedLines[wrappedLines.length - 1];

        if (! currentLine || `${currentLine} ${word}`.trim().length > maxLineLength) {
            wrappedLines.push(word);
        } else {
            wrappedLines[wrappedLines.length - 1] = `${currentLine} ${word}`;
        }

        return wrappedLines;
    }, []);

    return lines.length > 1 ? lines : label;
}

export default function SystemPerformanceDashboard({
    accountMetrics,
    workflowMetrics,
    auditMetrics,
    trainingMetrics,
    recentAuditLogs,
}: DashboardProps) {
    const roleDistributionColors = ['#4A7C3C', '#2A6F97', '#C89C3D', '#FF0056'];
    const roleDistributionLabels = ['Administrators', 'HR Personnel', 'Evaluators', 'Employees'];
    const roleDistributionValues = [
        accountMetrics.byRole.administrators,
        accountMetrics.byRole.hrPersonnel,
        accountMetrics.byRole.evaluators,
        accountMetrics.byRole.employees,
    ];

    const workflowStatusLabels = ['Routed', 'Completed', 'Returned', 'Pending'];
    const workflowStatusDatasets = [
        {
            label: 'Leave',
            data: [
                workflowMetrics.leave.routed,
                workflowMetrics.leave.completed,
                workflowMetrics.leave.returned,
                workflowMetrics.leave.pendingReason,
            ],
            backgroundColor: '#4A7C3C',
            borderColor: '#4A7C3C',
        },
        {
            label: 'IPCR',
            data: [
                workflowMetrics.ipcr.routed,
                workflowMetrics.ipcr.completed,
                workflowMetrics.ipcr.returned,
                workflowMetrics.ipcr.pendingEvaluation,
            ],
            backgroundColor: '#2A6F97',
            borderColor: '#2A6F97',
        },
    ];
    const workflowLegendItems = workflowStatusDatasets.map((dataset) => ({
        color: dataset.backgroundColor,
        label: dataset.label,
        value: dataset.data.reduce((total, value) => total + value, 0),
    }));
    const workflowStatusBreakdown = workflowStatusLabels.map((label, index) => ({
        label,
        leave: workflowStatusDatasets[0]?.data[index] ?? 0,
        ipcr: workflowStatusDatasets[1]?.data[index] ?? 0,
        total: (workflowStatusDatasets[0]?.data[index] ?? 0) + (workflowStatusDatasets[1]?.data[index] ?? 0),
    }));

    const auditMixColors = ['#009688', '#F97316'];
    const auditMixLabels = ['Leave Events', 'IPCR Events'];
    const auditMixValues = [auditMetrics.leaveEvents, auditMetrics.ipcrEvents];
    const auditMixLegendItems = auditMixLabels.map((label, index) => ({
        color: auditMixColors[index] ?? '#009688',
        label,
        value: auditMixValues[index] ?? 0,
    }));
    const totalAuditMixEvents = auditMixValues.reduce((sum, value) => sum + value, 0);
    const dominantAuditMixIndex = auditMixValues.findIndex((value) => value === Math.max(...auditMixValues, 0));
    const dominantAuditMixLabel = dominantAuditMixIndex >= 0 ? auditMixLabels[dominantAuditMixIndex] : 'No dominant source';
    const dominantAuditMixValue = dominantAuditMixIndex >= 0 ? auditMixValues[dominantAuditMixIndex] ?? 0 : 0;
    const dominantAuditMixShare = totalAuditMixEvents > 0 ? (dominantAuditMixValue / totalAuditMixEvents) * 100 : 0;

    const routingActionLabels = auditMetrics.routingActions.map((item) => wrapChartLabel(formatActionLabel(item.action), 16));
    const routingActionDatasets = [
        {
            label: 'Audit Count',
            data: auditMetrics.routingActions.map((item) => item.total),
            backgroundColor: '#C89C3D',
            borderColor: '#C89C3D',
        },
    ];
    const routingActionSummaryItems = auditMetrics.routingActions.slice(0, 3).map((item) => ({
        color: '#C89C3D',
        label: formatActionLabel(item.action),
        value: item.total,
    }));

    const trainingAreaLabels = trainingMetrics.targetAreas.map((item) => wrapChartLabel(item.area, 20));
    const trainingAreaDatasets = [
        {
            label: 'Scheduled Focus',
            data: trainingMetrics.targetAreas.map((item) => item.total),
            backgroundColor: '#009688',
            borderColor: '#009688',
        },
    ];
    const trainingFocusItems = trainingMetrics.targetAreas.slice(0, 3).map((item) => ({
        color: '#009688',
        label: item.area,
        value: item.total,
    }));
    const roleLegendItems = roleDistributionLabels.map((label, index) => ({
        color: roleDistributionColors[index] ?? '#4A7C3C',
        label,
        value: roleDistributionValues[index] ?? 0,
    }));
    const totalWorkflowDocuments = workflowMetrics.leave.total + workflowMetrics.ipcr.total;
    const dominantRoleCount = Math.max(...roleDistributionValues, 0);
    const dominantRoleLabel = dominantRoleCount > 0
        ? roleDistributionLabels[roleDistributionValues.findIndex((value) => value === dominantRoleCount)] ?? 'No roles yet'
        : 'No roles yet';
    const topRoutingAction = auditMetrics.routingActions[0];
    const topTrainingArea = trainingMetrics.targetAreas[0];
    const auditSlides = recentAuditLogs.reduce<typeof recentAuditLogs[]>((slides, log, index) => {
        const slideIndex = Math.floor(index / 2);

        if (! slides[slideIndex]) {
            slides[slideIndex] = [];
        }

        slides[slideIndex].push(log);

        return slides;
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Dashboard" />

            <div className="flex w-full flex-col gap-5 p-4 md:p-6 xl:p-8">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="glass-card h-full border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Total Accounts</CardTitle>
                                <CardDescription>All Smart HRMS user accounts</CardDescription>
                            </div>
                            <Users className="size-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{accountMetrics.total}</p>
                            <p className="mt-2 text-sm text-muted-foreground">Active: {accountMetrics.active} | Inactive: {accountMetrics.inactive}</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card h-full border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Workflow Volume</CardTitle>
                                <CardDescription>Leave and IPCR documents processed</CardDescription>
                            </div>
                            <Workflow className="size-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{workflowMetrics.leave.total + workflowMetrics.ipcr.total}</p>
                            <p className="mt-2 text-sm text-muted-foreground">Leave: {workflowMetrics.leave.total} | IPCR: {workflowMetrics.ipcr.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card h-full border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Audit Events</CardTitle>
                                <CardDescription>IWR routing activity logged</CardDescription>
                            </div>
                            <Archive className="size-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{auditMetrics.totalEvents}</p>
                            <p className="mt-2 text-sm text-muted-foreground">Low confidence: {auditMetrics.lowConfidenceCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card h-full border-border/60 bg-card/85 shadow-sm backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Average Confidence</CardTitle>
                                <CardDescription>IWR decision confidence rate</CardDescription>
                            </div>
                            <Activity className="size-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{auditMetrics.averageConfidence.toFixed(2)}%</p>
                            <p className="mt-2 text-sm text-muted-foreground">Failed compliance: {auditMetrics.failedComplianceCount}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-12">
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-7">
                        <div className="pointer-events-none absolute -left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Workflow Status Comparison</CardTitle>
                            <CardDescription>Compare leave and IPCR movement across routing stages and completion outcomes.</CardDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100">
                                    {totalWorkflowDocuments} total routed documents
                                </Badge>
                                <Badge variant="outline" className="border-complement-sky-300/60 bg-complement-sky-100/70 text-complement-sky-900 dark:border-complement-sky-700/60 dark:bg-complement-sky-900/30 dark:text-complement-sky-100">
                                    {workflowMetrics.leave.completed + workflowMetrics.ipcr.completed} completed
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-3">
                            <DashboardLegend items={workflowLegendItems} />
                            <DashboardChartSurface className="flex flex-1 flex-col gap-4">
                                <div className="flex-1">
                                    <AdminDashboardBarChart
                                        labels={workflowStatusLabels}
                                        datasets={workflowStatusDatasets}
                                        className="h-full min-h-[15rem] sm:min-h-[18rem] lg:min-h-[19rem]"
                                    />
                                </div>
                            </DashboardChartSurface>
                        </CardContent>
                    </Card>
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-5">
                        <div className="pointer-events-none absolute right-0 top-0 size-36 rounded-full bg-chart-3/10 blur-3xl" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Account Role Distribution</CardTitle>
                            <CardDescription>See how administrator, HR, evaluator, and employee accounts are distributed.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                                {roleLegendItems.map((item) => (
                                    <div
                                        key={item.label}
                                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
                                    >
                                        <span className="inline-flex min-w-0 items-center gap-2">
                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                                        </span>
                                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <DashboardChartSurface className="flex flex-1 flex-col items-center justify-center gap-4">
                                <AdminDashboardDoughnutChart
                                    labels={roleDistributionLabels}
                                    data={roleDistributionValues}
                                    backgroundColor={roleDistributionColors}
                                    borderColor={roleDistributionColors}
                                    className="mx-auto h-[14rem] max-w-[16rem] sm:h-[16rem] sm:max-w-[17rem] lg:h-[17rem]"
                                />
                                <p className="mt-5 text-center text-xs text-muted-foreground">
                                    Live role totals for administrators, HR personnel, evaluators, and employees.
                                </p>
                            </DashboardChartSurface>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-12">
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-7">
                        <div className="pointer-events-none absolute right-8 top-8 size-32 rounded-full bg-[#C89C3D]/10 blur-3xl" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Routing Action Frequency</CardTitle>
                            <CardDescription>Track which IWR outcomes are appearing most often in the audit trail.</CardDescription>
                            {routingActionSummaryItems.length > 0 && <DashboardLegend items={routingActionSummaryItems} />}
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-3">
                            <DashboardChartSurface className="flex flex-1 flex-col">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {topRoutingAction && (
                                        <Badge variant="outline" className="border-[#C89C3D]/40 bg-[#C89C3D]/10 text-[#8A6721] dark:text-[#E5C680]">
                                            Top action: {formatActionLabel(topRoutingAction.action)}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="border-border/70 bg-background/70">
                                        {auditMetrics.totalEvents} audit trail events
                                    </Badge>
                                </div>
                                <AdminDashboardBarChart labels={routingActionLabels} datasets={routingActionDatasets} indexAxis="y" className="h-[16rem] sm:h-[18rem] lg:h-[20rem]" />
                            </DashboardChartSurface>
                        </CardContent>
                    </Card>
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-5">
                        <div className="pointer-events-none absolute right-0 top-10 size-36 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Recent Audit Activity</CardTitle>
                            <CardDescription>Browse the latest Intelligent Workflow Routing decisions and compliance results.</CardDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100">
                                    {recentAuditLogs.length} recent events
                                </Badge>
                                <Badge variant="outline" className="border-border/70 bg-background/70">
                                    Swipe for more details
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col">
                            {auditSlides.length > 0 ? (
                                <Carousel opts={{ align: 'start', loop: auditSlides.length > 1 }} className="w-full flex-1">
                                    <CarouselContent>
                                        {auditSlides.map((slide, index) => (
                                            <CarouselItem key={`audit-slide-${index}`}>
                                                <div className="grid min-h-[19rem] gap-3 sm:min-h-[20rem]">
                                                    {slide.map((log) => (
                                                        <div
                                                            key={log.id}
                                                            className={cn(
                                                                'flex h-full flex-col justify-between rounded-[24px] border p-4 shadow-sm backdrop-blur-md',
                                                                log.compliancePassed
                                                                    ? 'border-brand-200/70 bg-gradient-to-br from-white via-brand-50/65 to-brand-100/45 dark:border-brand-800/60 dark:from-white/[0.06] dark:via-brand-900/20 dark:to-brand-800/10'
                                                                    : 'border-rose-200/70 bg-gradient-to-br from-white via-rose-50/70 to-orange-50/60 dark:border-rose-900/60 dark:from-white/[0.06] dark:via-rose-950/30 dark:to-orange-950/10',
                                                            )}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="space-y-1">
                                                                    <p className="font-semibold">{log.employeeName}</p>
                                                                    <p className="text-xs text-muted-foreground">{log.employeeId} · {log.documentType}</p>
                                                                </div>
                                                                <Badge variant={log.compliancePassed ? 'secondary' : 'destructive'}>
                                                                    {log.compliancePassed ? <CheckCircle2 className="size-3" /> : <ShieldAlert className="size-3" />}
                                                                    {log.compliancePassed ? 'Passed' : 'Failed'}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-4 space-y-3">
                                                                <div className="rounded-xl border border-white/60 bg-white/65 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.08]">
                                                                    {log.routingAction}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{log.confidencePct !== null ? `${log.confidencePct.toFixed(2)}% confidence` : 'No confidence score'}</span>
                                                                    <span>•</span>
                                                                    <span>{log.loggedAt}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {slide.length === 1 && (
                                                        <div className="rounded-[24px] border border-dashed border-border/70 bg-white/45 p-4 text-sm text-muted-foreground backdrop-blur-md dark:bg-white/5">
                                                            More audit entries will appear here as new workflow events are recorded.
                                                        </div>
                                                    )}
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {auditSlides.length > 1 && (
                                        <>
                                            <CarouselPrevious className="top-auto bottom-0 left-auto right-12 translate-y-0 border-border/70 bg-background/80 backdrop-blur-sm" />
                                            <CarouselNext className="top-auto right-0 bottom-0 translate-y-0 border-border/70 bg-background/80 backdrop-blur-sm" />
                                        </>
                                    )}
                                </Carousel>
                            ) : (
                                <div className="flex min-h-[19rem] items-center rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground sm:min-h-[20rem]">
                                    No audit activity has been recorded yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-12">
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-7">
                        <div className="pointer-events-none absolute bottom-0 left-8 size-40 rounded-full bg-[#009688]/10 blur-3xl" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Training Demand Focus</CardTitle>
                            <CardDescription>Surface the most common performance areas receiving seminar attention.</CardDescription>
                            {trainingFocusItems.length > 0 && (
                                <Badge variant="outline" className="w-fit border-[#009688]/30 bg-[#009688]/10 text-[#0D6F67] dark:text-[#7EDAD0]">
                                    {trainingFocusItems.length} active focus areas
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-white/60 bg-white/75 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scheduled seminars</p>
                                    <p className="mt-2 text-3xl font-bold">{trainingMetrics.scheduledCount}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Current development sessions prepared</p>
                                </div>
                                <div className="rounded-2xl border border-white/60 bg-white/75 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Primary focus</p>
                                    <p className="mt-2 text-xl font-semibold">{topTrainingArea?.area ?? 'No focus area yet'}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{topTrainingArea?.total ?? 0} scheduled seminar touchpoints</p>
                                </div>
                            </div>
                            <DashboardChartSurface className="flex flex-1 flex-col">
                                <AdminDashboardBarChart labels={trainingAreaLabels} datasets={trainingAreaDatasets} indexAxis="y" className="h-[16rem] sm:h-[17rem] lg:h-[18rem]" />
                            </DashboardChartSurface>
                        </CardContent>
                    </Card>
                    <Card className="glass-card relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card/85 shadow-sm backdrop-blur-xl xl:col-span-5">
                        <div className="pointer-events-none absolute left-0 bottom-0 size-36 rounded-full bg-[#F97316]/10 blur-3xl" />
                        <CardHeader className="relative space-y-3 pb-3">
                            <CardTitle>Audit Document Mix</CardTitle>
                            <CardDescription>Understand which document types are driving routing activity.</CardDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-[#009688]/30 bg-[#009688]/10 text-[#0D6F67] dark:text-[#7EDAD0]">
                                    {totalAuditMixEvents} total audit events
                                </Badge>
                                <Badge variant="outline" className="border-[#F97316]/30 bg-[#F97316]/10 text-[#A64B11] dark:text-[#FDBA74]">
                                    Leading source: {dominantAuditMixLabel}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-3">
                            <DashboardChartSurface className="flex flex-1 flex-col gap-4">
                                <AdminDashboardDoughnutChart
                                    labels={auditMixLabels}
                                    data={auditMixValues}
                                    backgroundColor={auditMixColors}
                                    borderColor={auditMixColors}
                                    className="mx-auto h-[14rem] max-w-[15rem] sm:h-[15rem] lg:h-[16rem]"
                                />
                                <div className="my-3 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Primary source</p>
                                        <p className="mt-2 text-lg font-semibold">{dominantAuditMixLabel}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{dominantAuditMixValue} events</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Share of total</p>
                                        <p className="mt-2 text-lg font-semibold">{dominantAuditMixShare.toFixed(1)}%</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Largest document contribution</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
                                        <p className="mt-2 text-lg font-semibold">{auditMixLegendItems.length} types</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Tracked in the audit trail</p>
                                    </div>
                                </div>
                            </DashboardChartSurface>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
