import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileSpreadsheet, Filter, Megaphone, Search, Send } from 'lucide-react';
import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { getAdjectivalRating } from '@/lib/ipcr';
import { cn } from '@/lib/utils';
import { evaluationPage, submitEvaluation, documentManagement } from '@/routes';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem, IpcrSubmission } from '@/types';

type CurrentPeriod = {
    label: string;
    year: number;
    isOpen: boolean;
};

type EmployeePanel = {
    launchFormUrl: string;
    canOpenForm: boolean;
    periodMessage: string;
    history: IpcrSubmission[];
};

type EvaluatorEmployee = {
    id: number;
    name: string;
    email: string;
    role: string;
    position: string;
    employeeId: string | null;
    submissionStatus: string | null;
    submissionStage: string | null;
    finalRating: number | null;
    remarks: string | null;
};

type EvaluatorPanel = {
    search: string;
    statusFilter: string;
    stageFilter: string;
    periodOpen: boolean;
    employees: EvaluatorEmployee[];
    pagination: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
    stats: {
        trackedEmployees: number;
        submitted: number;
        pendingEvaluation: number;
        routedToHr: number;
    };
};

type HrPanel = {
    defaultView: 'review' | 'finalization';
    reviewQueue: IpcrSubmission[];
    finalizationQueue: IpcrSubmission[];
    stats: {
        pendingReview: number;
        pendingFinalization: number;
        appealWindowOpen: number;
        escalated: number;
    };
};

type PmtPanel = {
    submissions: IpcrSubmission[];
    stats: {
        pendingReview: number;
        appealed: number;
        returnedForReevaluation: number;
        escalated: number;
    };
};

type PageProps = {
    roleView: 'employee' | 'evaluator' | 'hr' | 'pmt';
    currentPeriod?: CurrentPeriod;
    latestSubmission?: IpcrSubmission | null;
    employeePanel?: EmployeePanel | null;
    evaluatorPanel?: EvaluatorPanel | null;
    hrPanel?: HrPanel | null;
    pmtPanel?: PmtPanel | null;
};

function stageLabel(stage: string | null): string {
    return stage
        ? stage.replaceAll('_', ' ').replace(/\b\w/g, (value) => value.toUpperCase())
        : 'No Submission Yet';
}

function statusLabel(status: string | null): string {
    return status
        ? status.replaceAll('_', ' ').replace(/\b\w/g, (value) => value.toUpperCase())
        : 'Draft';
}

function computedRating(submission: IpcrSubmission): number | null {
    return submission.form_payload.summary.computed_rating ?? submission.performance_rating;
}

function finalDisplayRating(submission: IpcrSubmission): number | null {
    return submission.final_rating ?? computedRating(submission);
}

function evaluatorActionState(employee: EvaluatorEmployee, periodOpen: boolean): {
    label: string;
    disabled: boolean;
    href: string | null;
} {
    if (!employee.submissionStage) {
        return {
            label: 'Waiting for Submission',
            disabled: true,
            href: null,
        };
    }

    if (employee.submissionStage === 'finalized' || employee.submissionStatus === 'completed') {
        return {
            label: 'Already Evaluated',
            disabled: true,
            href: null,
        };
    }

    if (!periodOpen) {
        return {
            label: 'Evaluation Closed',
            disabled: true,
            href: null,
        };
    }

    if (['sent_to_evaluator', 'data_saved', 'remarks_saved'].includes(employee.submissionStage)) {
        return {
            label: 'Open Evaluation',
            disabled: false,
            href: employee.employeeId ? evaluationPage({ query: { employee_id: employee.employeeId } }).url : null,
        };
    }

    const stageLabels: Record<string, string> = {
        sent_to_hr: 'Under HR Review',
        appeal_window_open: 'Appeal Window Open',
        sent_to_pmt: 'Under PMT Review',
        sent_to_hr_finalize: 'For Finalization',
        escalated: 'Escalated',
    };

    return {
        label: stageLabels[employee.submissionStage] ?? 'Evaluation In Progress',
        disabled: true,
        href: null,
    };
}

const stripedTableRows = ['bg-[#DDEFD7] dark:bg-[#345A34]/80', 'bg-[#BFDDB5] dark:bg-[#274827]/80'];
const tableHeaderClasses = 'bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white';

function StatCard({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: number | string;
    tone?: 'default' | 'emerald' | 'sky' | 'amber';
}) {
    const toneClasses = {
        default: 'border-border bg-card',
        emerald: 'border-border bg-card',
        sky: 'border-border bg-card',
        amber: 'border-border bg-card',
    }[tone];

    return (
        <div className={cn('glass-card rounded-xl border p-4 shadow-sm', toneClasses)}>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
    );
}

function EmployeeOverview({
    currentPeriod,
    latestSubmission,
    employeePanel,
}: {
    currentPeriod: CurrentPeriod | undefined;
    latestSubmission: IpcrSubmission | null | undefined;
    employeePanel: EmployeePanel | null | undefined;
}) {
    const history = employeePanel?.history ?? [];

    return (
        <div className="space-y-6">
            <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                Performance Evaluation
                            </div>
                            <CardTitle className="text-2xl">Employee Performance Evaluation</CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-6">
                                {employeePanel?.periodMessage}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Period: {currentPeriod?.label ?? 'Not set'}</Badge>
                            <Badge variant="outline">{currentPeriod?.isOpen ? 'Evaluation Period Open' : 'Evaluation Period Closed'}</Badge>
                            {latestSubmission?.status && <Badge variant="outline">Latest Status: {statusLabel(latestSubmission.status)}</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                    {latestSubmission && (
                        <>
                            <IpcrWorkflowStepper
                                stage={latestSubmission.stage}
                                status={latestSubmission.status}
                                isEscalated={latestSubmission.is_escalated}
                            />
                            {latestSubmission.is_escalated && (
                                <EscalationWarning reason={latestSubmission.escalation_reason} />
                            )}
                            {latestSubmission.appeal_status === 'appeal_window_open' && latestSubmission.appeal_window_closes_at && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <AppealCountdown closesAt={latestSubmission.appeal_window_closes_at} />
                                    {latestSubmission.appeal_url && (
                                        <Button asChild variant="outline">
                                            <Link href={latestSubmission.appeal_url}>Open Appeal</Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {employeePanel?.canOpenForm ? (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href={employeePanel.launchFormUrl}>Open IPCR Form</Link>
                            </Button>
                        ) : (
                            <Button type="button" className="w-full sm:w-auto" disabled>
                                Open IPCR Form
                            </Button>
                        )}
                        {!employeePanel?.canOpenForm && (
                            <p className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                HR needs to enable the evaluation period before you can start a new form.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6">
                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Past IPCR Forms</CardTitle>
                        <CardDescription>Review your previous performance evaluation submissions and open the selected snapshot in the IPCR workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground">
                                    No IPCR history yet.
                                </div>
                            ) : (
                                history.map((submission) => (
                                    <div
                                        key={submission.id}
                                        className="glass-card rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Period
                                                    </p>
                                                    <p className="text-sm font-semibold text-foreground sm:text-base">
                                                        {submission.form_payload.metadata.period ?? 'Current Period'}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full lg:w-auto"
                                                    onClick={() =>
                                                        router.get(
                                                            employeePanel?.launchFormUrl ?? '#',
                                                            { submission_id: submission.id },
                                                        )
                                                    }
                                                >
                                                    Open Snapshot
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Status
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {statusLabel(submission.status)}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Stage
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {stageLabel(submission.stage)}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                        Rating
                                                    </p>
                                                    <p className="mt-1 font-medium text-foreground">
                                                        {finalDisplayRating(submission)?.toFixed(2) ??
                                                            'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function EvaluatorOverview({
    currentPeriod,
    evaluatorPanel,
}: {
    currentPeriod: CurrentPeriod | undefined;
    evaluatorPanel: EvaluatorPanel | null | undefined;
}) {
    const [search, setSearch] = useState(evaluatorPanel?.search ?? '');
    const [statusFilter, setStatusFilter] = useState(evaluatorPanel?.statusFilter ?? '');
    const [stageFilter, setStageFilter] = useState(evaluatorPanel?.stageFilter ?? '');

    useEffect(() => {
        setSearch(evaluatorPanel?.search ?? '');
        setStatusFilter(evaluatorPanel?.statusFilter ?? '');
        setStageFilter(evaluatorPanel?.stageFilter ?? '');
    }, [evaluatorPanel?.search, evaluatorPanel?.stageFilter, evaluatorPanel?.statusFilter]);

    const filters = {
        search,
        statusFilter,
        stageFilter,
        page: evaluatorPanel?.pagination.currentPage ?? 1,
        perPage: evaluatorPanel?.pagination.perPage ?? 10,
    };

    const reload = (nextFilters: typeof filters): void => {
        router.get(documentManagement().url, nextFilters, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleRowsPerPageChange = (value: string): void => {
        reload({
            ...filters,
            page: 1,
            perPage: Number(value),
        });
    };

    const goToPreviousPage = (): void => {
        if ((evaluatorPanel?.pagination.currentPage ?? 1) <= 1) {
            return;
        }

        reload({
            ...filters,
            page: (evaluatorPanel?.pagination.currentPage ?? 1) - 1,
        });
    };

    const goToNextPage = (): void => {
        if ((evaluatorPanel?.pagination.currentPage ?? 1) >= (evaluatorPanel?.pagination.lastPage ?? 1)) {
            return;
        }

        reload({
            ...filters,
            page: (evaluatorPanel?.pagination.currentPage ?? 1) + 1,
        });
    };

    return (
        <div className="space-y-6">
            <Card className="glass-card border-border bg-card shadow-sm">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl">Performance Evaluation</CardTitle>
                            <CardDescription>
                                Documents, evaluation routing, and current employee IPCR status for the Administrative Office.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Period: {currentPeriod?.label ?? 'Not set'}</Badge>
                            <Badge variant="outline">{evaluatorPanel?.periodOpen ? 'Evaluation Enabled' : 'Evaluation Disabled'}</Badge>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard label="Tracked Employees" value={evaluatorPanel?.stats.trackedEmployees ?? 0} />
                        <StatCard label="Submitted" value={evaluatorPanel?.stats.submitted ?? 0} tone="sky" />
                        <StatCard label="Pending Evaluation" value={evaluatorPanel?.stats.pendingEvaluation ?? 0} tone="amber" />
                        <StatCard label="Routed To HR" value={evaluatorPanel?.stats.routedToHr ?? 0} tone="emerald" />
                    </div>

                    {!evaluatorPanel?.periodOpen && (
                        <div className="rounded-[24px] border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                            The HR personnel has not enabled the evaluation period yet. You can inspect the table, but evaluation actions stay disabled until the period is opened.
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search employee ID, name, or position"
                                className="border-border bg-background pl-9"
                            />
                        </div>
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
                        >
                            <SelectTrigger className="border-border bg-background">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="routed">Routed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="escalated">Escalated</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={stageFilter || 'all'}
                            onValueChange={(value) => setStageFilter(value === 'all' ? '' : value)}
                        >
                            <SelectTrigger className="border-border bg-background">
                                <SelectValue placeholder="Filter by stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="sent_to_evaluator">Ready For Evaluator</SelectItem>
                                <SelectItem value="sent_to_hr">Sent To HR</SelectItem>
                                <SelectItem value="sent_to_pmt">Sent To PMT</SelectItem>
                                <SelectItem value="sent_to_hr_finalize">For Finalization</SelectItem>
                                <SelectItem value="finalized">Finalized</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => reload(filters)}>
                            <Filter className="size-4" />
                            Apply Filters
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('');
                                setStageFilter('');
                                reload({ ...filters, search: '', statusFilter: '', stageFilter: '' });
                            }}
                        >
                            Clear
                        </Button>
                    </div>

                    <div className="glass-card w-full min-w-0 overflow-hidden rounded-md border border-border bg-card shadow-sm">
                        <Table className="w-full min-w-[1280px] xl:min-w-[1400px]">
                            <TableHeader>
                                <TableRow className={tableHeaderClasses}>
                                    <TableHead className="w-[11rem] min-w-[11rem]">Employee ID</TableHead>
                                    <TableHead className="w-[22rem] min-w-[22rem]">Name</TableHead>
                                    <TableHead className="w-[18rem] min-w-[18rem]">Position</TableHead>
                                    <TableHead className="w-[12rem] min-w-[12rem]">Status</TableHead>
                                    <TableHead className="w-[18rem] min-w-[18rem]">Stage</TableHead>
                                    <TableHead className="w-[14rem] min-w-[14rem] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(evaluatorPanel?.employees ?? []).map((employee, index) => {
                                    const actionState = evaluatorActionState(employee, evaluatorPanel?.periodOpen ?? false);

                                    return (
                                        <TableRow
                                            key={employee.employeeId}
                                            className={cn('text-sm font-semibold text-foreground', stripedTableRows[index % 2])}
                                        >
                                            <TableCell>{employee.employeeId}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{employee.name}</p>
                                                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{employee.position}</TableCell>
                                            <TableCell>{statusLabel(employee.submissionStatus)}</TableCell>
                                            <TableCell>{stageLabel(employee.submissionStage)}</TableCell>
                                            <TableCell className="text-right">
                                                {actionState.disabled ? (
                                                    <Button type="button" size="sm" disabled>
                                                        {actionState.label}
                                                    </Button>
                                                ) : (
                                                    <Button asChild size="sm">
                                                        <Link href={actionState.href ?? '#'}>
                                                            {actionState.label}
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="app-table-pagination-bar">
                        <div className="app-table-pagination-shell">
                            <div className="app-table-pagination-page-size">
                                <span>Rows per page</span>
                                <Select
                                    value={String(evaluatorPanel?.pagination.perPage ?? 10)}
                                    onValueChange={handleRowsPerPageChange}
                                >
                                    <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="app-table-pagination-controls">
                                <span className="app-table-pagination-status">
                                    Page {evaluatorPanel?.pagination.currentPage ?? 1} of {evaluatorPanel?.pagination.lastPage ?? 1}
                                </span>
                                <Pagination className="app-table-pagination-nav">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    goToPreviousPage();
                                                }}
                                                className={(evaluatorPanel?.pagination.currentPage ?? 1) === 1 ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    goToNextPage();
                                                }}
                                                className={(evaluatorPanel?.pagination.currentPage ?? 1) === (evaluatorPanel?.pagination.lastPage ?? 1) ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function HrOverview({
    currentPeriod,
    hrPanel,
}: {
    currentPeriod: CurrentPeriod | undefined;
    hrPanel: HrPanel | null | undefined;
}) {
    const [view, setView] = useState<'review' | 'finalization'>(hrPanel?.defaultView ?? 'review');
    const [selectedReview, setSelectedReview] = useState<IpcrSubmission | null>(null);
    const [selectedFinalize, setSelectedFinalize] = useState<IpcrSubmission | null>(null);
    const [hrDecision, setHrDecision] = useState<'approved' | 'rejected' | ''>('');
    const [hrRemarks, setHrRemarks] = useState('');
    const [periodLabel, setPeriodLabel] = useState(currentPeriod?.label ?? '');
    const [periodYear, setPeriodYear] = useState(String(currentPeriod?.year ?? new Date().getFullYear()));
    const [periodOpen, setPeriodOpen] = useState(currentPeriod?.isOpen ?? false);
    const [finalRating, setFinalRating] = useState('');

    useEffect(() => {
        setView(hrPanel?.defaultView ?? 'review');
    }, [hrPanel?.defaultView]);

    useEffect(() => {
        setPeriodLabel(currentPeriod?.label ?? '');
        setPeriodYear(String(currentPeriod?.year ?? new Date().getFullYear()));
        setPeriodOpen(currentPeriod?.isOpen ?? false);
    }, [currentPeriod?.isOpen, currentPeriod?.label, currentPeriod?.year]);

    useEffect(() => {
        if (selectedReview) {
            setHrDecision(selectedReview.stage === 'sent_to_hr' ? '' : ((selectedReview.hr_decision as 'approved' | 'rejected' | null) ?? ''));
            setHrRemarks(selectedReview.hr_remarks ?? '');
        }
    }, [selectedReview]);

    useEffect(() => {
        if (selectedFinalize) {
            setFinalRating(String(finalDisplayRating(selectedFinalize) ?? ''));
        }
    }, [selectedFinalize]);

    const reviewRows = view === 'review' ? hrPanel?.reviewQueue ?? [] : hrPanel?.finalizationQueue ?? [];

    const adjectivalPreview = useMemo(() => {
        const numeric = Number(finalRating);

        return Number.isNaN(numeric) ? 'Pending' : (getAdjectivalRating(numeric) ?? 'Pending');
    }, [finalRating]);

    return (
        <div className="space-y-6">
            <Card className="glass-card border-border bg-card shadow-sm">
                <CardHeader className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl">Performance Evaluation</CardTitle>
                            <CardDescription>Combined HR review, finalization queue, and period controls for the IPCR workflow.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant={view === 'review' ? 'default' : 'outline'} onClick={() => setView('review')}>IPCR Review</Button>
                            <Button type="button" variant={view === 'finalization' ? 'default' : 'outline'} onClick={() => setView('finalization')}>IPCR Finalization</Button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard label="Pending Review" value={hrPanel?.stats.pendingReview ?? 0} />
                        <StatCard label="Pending Finalization" value={hrPanel?.stats.pendingFinalization ?? 0} tone="sky" />
                        <StatCard label="Appeal Window Open" value={hrPanel?.stats.appealWindowOpen ?? 0} tone="amber" />
                        <StatCard label="Escalated" value={hrPanel?.stats.escalated ?? 0} tone="emerald" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-6">
                        <div className="glass-card rounded-md border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                                <h3 className="text-lg font-semibold">Evaluation Period Control</h3>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Enable or pause employee submission and evaluator processing. Opening the period triggers notifications to employees and evaluators.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>Semester Label</Label>
                                    <Input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Input value={periodYear} onChange={(event) => setPeriodYear(event.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Period Status</Label>
                                    <Select value={periodOpen ? 'open' : 'closed'} onValueChange={(value) => setPeriodOpen(value === 'open')}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
                                    <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Current State</p>
                                    <p className="mt-1 font-medium text-foreground">
                                        {periodOpen ? 'Enabled for submission and evaluation' : 'Disabled by default until HR opens the period'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    disabled={!periodLabel.trim() || !periodYear.trim()}
                                    onClick={() => {
                                        router.post('/admin/ipcr/period', {
                                            label: periodLabel.trim(),
                                            year: Number(periodYear),
                                            is_open: periodOpen,
                                        });
                                    }}
                                >
                                    <Send className="size-4" />
                                    {periodOpen ? 'Open Evaluation Period' : 'Keep Evaluation Period Closed'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.post('/admin/training-suggestions/notify')}
                                >
                                    <Megaphone className="size-4" />
                                    Notify Training Discovery
                                </Button>
                            </div>
                        </div>

                        <div className="glass-card overflow-x-auto rounded-md border border-border bg-card shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className={tableHeaderClasses}>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Stage</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {reviewRows.map((submission, index) => (
                                        <TableRow key={submission.id} className={cn('text-sm font-semibold text-foreground', stripedTableRows[index % 2])}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{submission.employee?.name ?? submission.employee_id}</p>
                                                    <p className="text-xs text-muted-foreground">{submission.employee?.job_title ?? 'Administrative Office'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{statusLabel(submission.status)}</TableCell>
                                            <TableCell>{stageLabel(submission.stage)}</TableCell>
                                            <TableCell>{finalDisplayRating(submission)?.toFixed(2) ?? 'Pending'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (view === 'review') {
                                                            setSelectedReview(submission);
                                                        } else {
                                                            setSelectedFinalize(submission);
                                                        }
                                                    }}
                                                >
                                                    {view === 'review'
                                                        ? submission.stage === 'sent_to_hr'
                                                            ? 'Review'
                                                            : 'View Review'
                                                        : submission.stage === 'sent_to_hr_finalize'
                                                            ? 'Finalize'
                                                            : 'View Finalization'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {reviewRows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                                No IPCR records available for this view yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={selectedReview !== null} onOpenChange={(open) => !open && setSelectedReview(null)}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedReview && (
                        (() => {
                            const isReviewEditable = selectedReview.stage === 'sent_to_hr';

                            return (
                                <>
                            <DialogHeader>
                                <DialogTitle>{isReviewEditable ? 'HR Review' : 'HR Review Snapshot'}</DialogTitle>
                                <DialogDescription>{selectedReview.employee?.name ?? selectedReview.employee_id}</DialogDescription>
                            </DialogHeader>
                            <IpcrPaperForm value={selectedReview.form_payload} mode="review" />
                            {!isReviewEditable && (
                                <div className="rounded-[24px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                    This IPCR has already moved past HR review. You can inspect the saved review details here, but it can no longer be changed from this dialog.
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Decision</Label>
                                    <Select
                                        value={hrDecision || 'none'}
                                        onValueChange={(value) => setHrDecision(value === 'none' ? '' : value as 'approved' | 'rejected')}
                                        disabled={!isReviewEditable}
                                    >
                                        <SelectTrigger className="border-border bg-background">
                                            <SelectValue placeholder="Select a decision" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select a decision</SelectItem>
                                            <SelectItem value="approved">Approve</SelectItem>
                                            <SelectItem value="rejected">Return to Evaluator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>HR Remarks</Label>
                                    <Textarea
                                        value={hrRemarks}
                                        onChange={(event) => setHrRemarks(event.target.value)}
                                        placeholder="Required when returning the evaluation to the evaluator."
                                        className="min-h-28 border-border bg-background"
                                        readOnly={!isReviewEditable}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelectedReview(null)}>Close</Button>
                                <Button
                                    type="button"
                                    disabled={!isReviewEditable || !hrDecision || (hrDecision === 'rejected' && !hrRemarks.trim())}
                                    onClick={() => {
                                        router.post(
                                            `/ipcr/hr-review/${selectedReview.id}`,
                                            {
                                                hr_decision: hrDecision,
                                                hr_remarks: hrDecision === 'rejected' ? hrRemarks.trim() : null,
                                            },
                                            {
                                                onSuccess: () => {
                                                    setSelectedReview(null);
                                                    setHrDecision('');
                                                    setHrRemarks('');
                                                },
                                            },
                                        );
                                    }}
                                >
                                    {isReviewEditable ? 'Save HR Review' : 'Review Already Recorded'}
                                </Button>
                            </DialogFooter>
                                </>
                            );
                        })()
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={selectedFinalize !== null} onOpenChange={(open) => !open && setSelectedFinalize(null)}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedFinalize && (
                        (() => {
                            const isFinalizeEditable = selectedFinalize.stage === 'sent_to_hr_finalize';

                            return (
                                <>
                            <DialogHeader>
                                <DialogTitle>{isFinalizeEditable ? 'HR Finalization' : 'Finalized IPCR Snapshot'}</DialogTitle>
                                <DialogDescription>Record the final rating after PMT review.</DialogDescription>
                            </DialogHeader>
                            <IpcrPaperForm value={selectedFinalize.form_payload} mode="review" />
                            {!isFinalizeEditable && (
                                <div className="rounded-[24px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                    This IPCR has already been finalized. The dialog stays available so HR can reopen the saved finalization snapshot anytime.
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Final Rating</Label>
                                    <Input type="number" min="1" max="5" step="0.01" value={finalRating} onChange={(event) => setFinalRating(event.target.value)} className="border-border bg-background" readOnly={!isFinalizeEditable} />
                                </div>
                                <div className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
                                    <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Live Adjectival Preview</p>
                                    <p className="mt-2 text-lg font-semibold">{adjectivalPreview}</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelectedFinalize(null)}>Close</Button>
                                <Button
                                    type="button"
                                    disabled={!isFinalizeEditable || !finalRating}
                                    onClick={() => {
                                        router.post(
                                            `/ipcr/finalize/${selectedFinalize.id}`,
                                            {
                                                final_rating: Number(finalRating),
                                            },
                                            {
                                                onSuccess: () => {
                                                    setSelectedFinalize(null);
                                                    setFinalRating('');
                                                },
                                            },
                                        );
                                    }}
                                >
                                    {isFinalizeEditable ? 'Finalize IPCR' : 'Already Finalized'}
                                </Button>
                            </DialogFooter>
                                </>
                            );
                        })()
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PmtOverview({ pmtPanel }: { pmtPanel: PmtPanel | null | undefined }) {
    const [selectedSubmission, setSelectedSubmission] = useState<IpcrSubmission | null>(null);
    const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (selectedSubmission) {
            setDecision('');
            setRemarks(selectedSubmission.pmt_remarks ?? '');
        }
    }, [selectedSubmission]);

    return (
        <div className="space-y-6">
            <Card className="glass-card border-border bg-card shadow-sm">
                <CardHeader className="space-y-5">
                    <div className="space-y-2">
                        <CardTitle className="text-2xl">Performance Evaluation</CardTitle>
                        <CardDescription>PMT review queue with appeal context and the saved Administrative Office IPCR form snapshot.</CardDescription>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard label="Pending Review" value={pmtPanel?.stats.pendingReview ?? 0} />
                        <StatCard label="Appealed" value={pmtPanel?.stats.appealed ?? 0} tone="sky" />
                        <StatCard label="Returned" value={pmtPanel?.stats.returnedForReevaluation ?? 0} tone="amber" />
                        <StatCard label="Escalated" value={pmtPanel?.stats.escalated ?? 0} tone="emerald" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="glass-card overflow-x-auto rounded-md border border-border bg-card shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className={tableHeaderClasses}>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Appeal</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(pmtPanel?.submissions ?? []).map((submission, index) => (
                                    <TableRow key={submission.id} className={cn('text-sm font-semibold text-foreground', stripedTableRows[index % 2])}>
                                        <TableCell>{submission.employee?.name ?? submission.employee_id}</TableCell>
                                        <TableCell>{submission.appeal_status === 'appealed' ? 'Appealed' : 'No Appeal'}</TableCell>
                                        <TableCell>{stageLabel(submission.stage)}</TableCell>
                                        <TableCell>{submission.performance_rating?.toFixed(2) ?? 'Pending'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button type="button" size="sm" onClick={() => setSelectedSubmission(submission)}>
                                                Open Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={selectedSubmission !== null} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedSubmission && (
                        <>
                            <DialogHeader>
                                <DialogTitle>PMT Review</DialogTitle>
                                <DialogDescription>
                                    Review the employee submission, appeal details, and supporting evidence before routing the next action.
                                </DialogDescription>
                            </DialogHeader>
                            <IpcrPaperForm value={selectedSubmission.form_payload} mode="review" />
                            {selectedSubmission.appeal?.appeal_reason && (
                                <div className="glass-card rounded-xl border border-border bg-card p-4 shadow-sm">
                                    <p className="text-sm font-semibold">Appeal Details</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{selectedSubmission.appeal.appeal_reason}</p>
                                    {selectedSubmission.appeal.evidence_files.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedSubmission.appeal.evidence_files.map((file) => (
                                                <Badge key={file} variant="outline">{file.split('/').pop()}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>PMT Decision</Label>
                                    <Select value={decision || 'none'} onValueChange={(value) => setDecision(value === 'none' ? '' : value as 'approved' | 'rejected')}>
                                        <SelectTrigger className="border-border bg-background">
                                            <SelectValue placeholder="Select a decision" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select a decision</SelectItem>
                                            <SelectItem value="approved">Approve</SelectItem>
                                            <SelectItem value="rejected">Return to Evaluator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>PMT Remarks</Label>
                                    <Textarea
                                        value={remarks}
                                        onChange={(event) => setRemarks(event.target.value)}
                                        placeholder="Required when returning to the evaluator."
                                        className="min-h-28 border-border bg-background"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelectedSubmission(null)}>Close</Button>
                                <Button
                                    type="button"
                                    disabled={!decision || (decision === 'rejected' && !remarks.trim())}
                                    onClick={() => {
                                        router.post(
                                            `/ipcr/pmt-review/${selectedSubmission.id}`,
                                            {
                                                pmt_decision: decision,
                                                pmt_remarks: decision === 'rejected' ? remarks.trim() : null,
                                            },
                                            {
                                                onSuccess: () => {
                                                    setSelectedSubmission(null);
                                                    setDecision('');
                                                    setRemarks('');
                                                },
                                            },
                                        );
                                    }}
                                >
                                    Save PMT Review
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function PerformanceEvaluationPage() {
    const { roleView, currentPeriod, latestSubmission, employeePanel, evaluatorPanel, hrPanel, pmtPanel } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Performance Evaluation',
            href: roleView === 'employee'
                ? submitEvaluation().url
                : roleView === 'evaluator'
                    ? documentManagement().url
                    : roleView === 'pmt'
                        ? admin.pmtReview().url
                        : admin.hrReview().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Performance Evaluation" />
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-6 xl:p-8">
                {roleView === 'employee' && (
                    <EmployeeOverview
                        currentPeriod={currentPeriod}
                        latestSubmission={latestSubmission}
                        employeePanel={employeePanel}
                    />
                )}
                {roleView === 'evaluator' && (
                    <EvaluatorOverview currentPeriod={currentPeriod} evaluatorPanel={evaluatorPanel} />
                )}
                {roleView === 'hr' && (
                    <HrOverview currentPeriod={currentPeriod} hrPanel={hrPanel} />
                )}
                {roleView === 'pmt' && (
                    <PmtOverview pmtPanel={pmtPanel} />
                )}
            </div>
        </AppLayout>
    );
}
