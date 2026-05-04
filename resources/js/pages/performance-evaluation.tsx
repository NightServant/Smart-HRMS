import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    Clock3,
    Database,
    FileCheck2,
    FileSpreadsheet,
    Filter,
    Megaphone,
    RotateCcw,
    Search,
    ShieldAlert,
} from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrHistoricalEntry from '@/components/ipcr-historical-entry';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrPeriodExtensions from '@/components/ipcr-period-extensions';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { getAppealEvidenceUrl, getFileName } from '@/lib/ipcr';
import { cn } from '@/lib/utils';
import { evaluationPage, submitEvaluation, documentManagement } from '@/routes';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem, IpcrSubmission } from '@/types';

type CurrentPeriod = {
    label: string;
    year: number;
    isOpen: boolean;
    nextEligible?: {
        semester: 1 | 2;
        year: number;
        label: string;
    };
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
    currentTargetStatus: 'draft' | 'submitted' | null;
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
    closedPeriods: import('@/components/ipcr-period-extensions').ClosedPeriod[];
    extensions: import('@/components/ipcr-period-extensions').ExtensionRow[];
};

type PmtPanel = {
    submissions: IpcrSubmission[];
    stats: {
        pendingReview: number;
        appealed: number;
        returnedForReevaluation: number;
    };
};

type PageProps = {
    roleView: 'employee' | 'evaluator' | 'hr' | 'pmt';
    currentPeriod?: CurrentPeriod;
    currentTargetPeriod?: {
        semester: 1 | 2;
        year: number;
        label: string;
        submissionOpen: boolean;
        submissionWindowLabel: string;
    };
    latestSubmission?: IpcrSubmission | null;
    employeePanel?: EmployeePanel | null;
    evaluatorPanel?: EvaluatorPanel | null;
    hrPanel?: HrPanel | null;
    pmtPanel?: PmtPanel | null;
};

function stageLabel(stage: string | null): string {
    return stage
        ? stage
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (value) => value.toUpperCase())
        : 'No Submission Yet';
}

function statusLabel(status: string | null): string {
    return status
        ? status
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (value) => value.toUpperCase())
        : 'Draft';
}

const submissionSemesterOptions = [
    {
        value: '1',
        label: 'January to June',
    },
    {
        value: '2',
        label: 'July to December',
    },
] as const;

function submissionSemesterFromLabel(label: string | null | undefined): '1' | '2' {
    return label?.includes('July to December') ? '2' : '1';
}

function submissionPeriodLabel(semester: '1' | '2', year: string): string {
    const safeYear = year.trim() || String(new Date().getFullYear());

    return semester === '2'
        ? `July to December ${safeYear}`
        : `January to June ${safeYear}`;
}

function computedRating(submission: IpcrSubmission): number | null {
    return (
        submission.form_payload.summary.computed_rating ??
        submission.performance_rating
    );
}

function finalDisplayRating(submission: IpcrSubmission): number | null {
    return submission.final_rating ?? computedRating(submission);
}

function evaluatorActionState(
    employee: EvaluatorEmployee,
    periodOpen: boolean,
): {
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

    if (
        employee.submissionStage === 'finalized' ||
        employee.submissionStatus === 'completed'
    ) {
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

    if (
        ['sent_to_evaluator', 'data_saved', 'remarks_saved'].includes(
            employee.submissionStage,
        )
    ) {
        return {
            label: 'Open Evaluation',
            disabled: false,
            href: employee.employeeId
                ? evaluationPage({
                    query: { employee_id: employee.employeeId },
                }).url
                : null,
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
        label:
            stageLabels[employee.submissionStage] ?? 'Evaluation In Progress',
        disabled: true,
        href: null,
    };
}

const stripedTableRows = [
    'border-b border-[#D4EBC8] bg-white transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#18291A]/40 dark:hover:bg-[#243C24]/70',
    'border-b border-[#D4EBC8] bg-[#F2FAF0] transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#1D2E1D]/60 dark:hover:bg-[#243C24]/70',
];

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
        <div
            className={cn(
                'glass-card rounded-xl border p-4 shadow-sm',
                toneClasses,
            )}
        >
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
                {value}
            </p>
        </div>
    );
}

function HrStatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    tone: 'amber' | 'emerald' | 'red' | 'blue';
}) {
    const toneMap = {
        amber: 'border-amber-500/20 bg-amber-500/10 text-amber-500 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
        emerald:
            'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
        red: 'border-red-500/20 bg-red-500/10 text-red-500 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
        blue: 'border-blue-500/20 bg-blue-500/10 text-blue-500 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300',
    } as const;

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 shadow-sm">
            <div
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl border',
                    toneMap[tone],
                )}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl leading-none font-semibold text-foreground">
                    {value}
                </p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                    {label}
                </p>
            </div>
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
    const periodOpen = currentPeriod?.isOpen ?? false;
    const launchFormLabel = periodOpen
        ? 'Open IPCR Form'
        : 'Preview IPCR Form';

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
                            <CardTitle className="text-2xl">
                                Employee Performance Evaluation
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-6">
                                {employeePanel?.periodMessage}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                                Period: {currentPeriod?.label ?? 'Not set'}
                            </Badge>
                            <Badge variant="outline">
                                {currentPeriod?.isOpen
                                    ? 'Evaluation Period Open'
                                    : 'Evaluation Period Closed'}
                            </Badge>
                            {latestSubmission?.status && (
                                <Badge variant="outline">
                                    Latest Status:{' '}
                                    {statusLabel(latestSubmission.status)}
                                </Badge>
                            )}
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
                                <EscalationWarning
                                    reason={latestSubmission.escalation_reason}
                                />
                            )}
                            {(latestSubmission.appeal_status ===
                                'appeal_window_open' ||
                                latestSubmission.stage ===
                                'appeal_window_open') &&
                                latestSubmission.appeal_window_closes_at && (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <AppealCountdown
                                            closesAt={
                                                latestSubmission.appeal_window_closes_at
                                            }
                                        />
                                        {latestSubmission.appeal_url && (
                                            <Button asChild variant="outline">
                                                <Link
                                                    href={
                                                        latestSubmission.appeal_url
                                                    }
                                                >
                                                    Open Appeal
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                        </>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {periodOpen && (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href={employeePanel?.launchFormUrl ?? '#'}>
                                    {launchFormLabel}
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {(employeePanel?.history ?? []).length > 0 && (
                <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle className="text-xl">IPCR History</CardTitle>
                        <CardDescription>
                            Your past IPCR submissions and their current workflow status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 py-5 sm:px-6">
                        <div className="space-y-5">
                            {(employeePanel?.history ?? []).map((sub) => {
                                const period = sub.form_payload?.metadata?.period ?? undefined;
                                const semester = semesterFromPeriodLabel(period);
                                const year = yearFromPeriodLabel(period);
                                const semesterShort = semester === 'First Semester'
                                    ? `${year} 1st Semester`
                                    : semester === 'Second Semester'
                                      ? `${year} 2nd Semester`
                                      : `${year}`;
                                const isFinalized = sub.stage === 'finalized';
                                const statusTone = isFinalized
                                    ? 'bg-emerald-500 ring-emerald-500/30'
                                    : sub.status === 'rejected'
                                      ? 'bg-red-500 ring-red-500/30'
                                      : sub.status === 'in_progress' || sub.stage === 'pmt_review' || sub.stage === 'hr_review' || sub.stage === 'evaluator_review'
                                        ? 'bg-[#2F5E2B] ring-[#2F5E2B]/30'
                                        : 'bg-amber-500 ring-amber-500/30';
                                const statusBadgeClass = isFinalized
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : sub.status === 'rejected'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                      : 'bg-[#DDEFD7] text-[#1F3F1D] dark:bg-[#274827]/80 dark:text-[#EAF7E6]';
                                const finalizedAt = sub.finalized_at
                                    ? new Date(sub.finalized_at).toLocaleString('en-US', {
                                          month: 'short',
                                          day: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : null;

                                return (
                                    <div key={sub.id} className="relative pl-6">
                                        <span className="absolute top-0 bottom-0 left-[7px] w-px bg-border" />
                                        <span
                                            className={cn(
                                                'absolute top-5 left-0 mt-1.5 inline-block size-3 shrink-0 rounded-full ring-4',
                                                statusTone,
                                            )}
                                        />
                                        <Card className="glass-card border-border bg-card shadow-sm">
                                            <CardContent className="space-y-4 p-5">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold tracking-[0.18em] text-[#2F5E2B] uppercase dark:text-[#A8D49E]">
                                                            {semesterShort}
                                                        </p>
                                                        <h3 className="text-lg leading-snug font-semibold text-foreground">
                                                            {semester} {year !== '—' ? year : ''}
                                                        </h3>
                                                    </div>
                                                    <Badge className={cn('rounded-full', statusBadgeClass)}>
                                                        {statusLabel(sub.status)}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <CalendarClock className="size-4 text-[#2F5E2B] dark:text-[#A8D49E]" />
                                                        <span className="font-medium text-foreground">Stage:</span>
                                                        <span>{statusLabel(sub.stage)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <FileCheck2 className="size-4 text-[#2F5E2B] dark:text-[#A8D49E]" />
                                                        <span className="font-medium text-foreground">Finalized:</span>
                                                        <span>{finalizedAt ?? '—'}</span>
                                                    </div>
                                                </div>

                                                {isFinalized && (
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#2F5E2B]/40 text-[#2F5E2B] hover:bg-[#DDEFD7] hover:text-[#1F3F1D] dark:border-[#4A7C3C]/40 dark:text-[#A8D49E] dark:hover:bg-[#274827]/80"
                                                        >
                                                            <a
                                                                href={`/ipcr/print?submission_id=${sub.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Open Printable PDF View
                                                            </a>
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function semesterFromPeriodLabel(label: string | undefined): string {
    if (!label) return '—';
    return label.includes('July to December') ? 'Second Semester' : 'First Semester';
}

function yearFromPeriodLabel(label: string | undefined): string {
    if (!label) return '—';
    return label.replace('January to June ', '').replace('July to December ', '').trim();
}

function EvaluatorOverview({
    currentPeriod,
    evaluatorPanel,
}: {
    currentPeriod: CurrentPeriod | undefined;
    evaluatorPanel: EvaluatorPanel | null | undefined;
}) {
    const [showList, setShowList] = useState(false);
    const [search, setSearch] = useState(evaluatorPanel?.search ?? '');

    useEffect(() => {
        startTransition(() => {
            setSearch(evaluatorPanel?.search ?? '');
        });
    }, [evaluatorPanel?.search]);

    const filters = {
        search,
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

    useEffect(() => {
        const previousSearch = evaluatorPanel?.search ?? '';

        if (search === previousSearch) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            reload({
                search,
                page: 1,
                perPage: evaluatorPanel?.pagination.perPage ?? 10,
            });
        }, 300);

        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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
        if (
            (evaluatorPanel?.pagination.currentPage ?? 1) >=
            (evaluatorPanel?.pagination.lastPage ?? 1)
        ) {
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
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                Performance Evaluation
                            </div>
                            <CardTitle className="text-2xl">
                                Evaluator IPCR Overview
                            </CardTitle>
                            <CardDescription>
                                Documents, evaluation routing, and current
                                employee IPCR status for the Administrative
                                Office.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                                Period: {currentPeriod?.label ?? 'Not set'}
                            </Badge>
                            <Badge variant="outline">
                                {evaluatorPanel?.periodOpen
                                    ? 'Evaluation Enabled'
                                    : 'Evaluation Disabled'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            label="Tracked Employees"
                            value={evaluatorPanel?.stats.trackedEmployees ?? 0}
                        />
                        <StatCard
                            label="Submitted"
                            value={evaluatorPanel?.stats.submitted ?? 0}
                            tone="sky"
                        />
                        <StatCard
                            label="Pending Evaluation"
                            value={evaluatorPanel?.stats.pendingEvaluation ?? 0}
                            tone="amber"
                        />
                        <StatCard
                            label="Routed To HR"
                            value={evaluatorPanel?.stats.routedToHr ?? 0}
                            tone="emerald"
                        />
                    </div>

                    {!evaluatorPanel?.periodOpen && (
                        <div className="rounded-[24px] border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                            The HR personnel has not enabled the evaluation
                            period yet. You can inspect the table, but
                            evaluation actions stay disabled until the period is
                            opened.
                        </div>
                    )}
                </CardHeader>
            </Card>

            <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border bg-card">
                    <CardTitle>Submission Periods</CardTitle>
                    <CardDescription className="mt-1">
                        Select a period to view and evaluate employee IPCR submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                    <th>Semester</th>
                                    <th>Year</th>
                                    <th>Pending Evaluation</th>
                                    <th>Submitted</th>
                                    <th className="!text-center">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPeriod ? (
                                    <tr className="border-b border-[#D4EBC8] bg-[#F2FAF0] text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#1D2E1D]/60 dark:hover:bg-[#243C24]/70">
                                        <td className="px-5 py-3.5">
                                            {semesterFromPeriodLabel(currentPeriod.label)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {yearFromPeriodLabel(currentPeriod.label)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                {evaluatorPanel?.stats.pendingEvaluation ?? 0} pending
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {evaluatorPanel?.stats.submitted ?? 0}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <Button size="sm" onClick={() => setShowList(true)}>
                                                View Employees
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                        >
                                            No active evaluation period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showList} onOpenChange={setShowList}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>Employee IPCR Submissions</DialogTitle>
                        <DialogDescription>
                            {semesterFromPeriodLabel(currentPeriod?.label)}{' '}
                            {yearFromPeriodLabel(currentPeriod?.label)} — review and evaluate employee submissions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search employees..."
                                className="border-border bg-background pl-9"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                        <th>Employee ID</th>
                                        <th>Name</th>
                                        <th>Position</th>
                                        <th>Status</th>
                                        <th>Stage</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(evaluatorPanel?.employees ?? []).map(
                                        (employee, index) => {
                                            const actionState =
                                                evaluatorActionState(
                                                    employee,
                                                    evaluatorPanel?.periodOpen ??
                                                    false,
                                                );

                                            return (
                                                <tr
                                                    key={employee.employeeId}
                                                    className={cn(
                                                        'text-sm font-semibold text-foreground',
                                                        stripedTableRows[index % 2],
                                                    )}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        {employee.employeeId}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div>
                                                            <p className="font-medium">
                                                                {employee.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {employee.email}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {employee.position}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {statusLabel(
                                                            employee.submissionStatus,
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {stageLabel(
                                                            employee.submissionStage,
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {actionState.disabled ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled
                                                            >
                                                                {actionState.label}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                            >
                                                                <Link
                                                                    href={
                                                                        actionState.href ??
                                                                        '#'
                                                                    }
                                                                >
                                                                    {
                                                                        actionState.label
                                                                    }
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                    {(evaluatorPanel?.employees ?? []).length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                            >
                                                No employees match the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="app-table-pagination-bar">
                            <div className="app-table-pagination-shell">
                                <div className="app-table-pagination-page-size">
                                    <span>Rows per page</span>
                                    <Select
                                        value={String(
                                            evaluatorPanel?.pagination.perPage ??
                                            10,
                                        )}
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
                                        Page{' '}
                                        {evaluatorPanel?.pagination.currentPage ??
                                            1}{' '}
                                        of{' '}
                                        {evaluatorPanel?.pagination.lastPage ?? 1}
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
                                                    className={
                                                        (evaluatorPanel?.pagination
                                                            .currentPage ?? 1) === 1
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
                                                        goToNextPage();
                                                    }}
                                                    className={
                                                        (evaluatorPanel?.pagination
                                                            .currentPage ?? 1) ===
                                                            (evaluatorPanel?.pagination
                                                                .lastPage ?? 1)
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
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowList(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function HrOverview({
    currentPeriod,
    currentTargetPeriod,
    hrPanel,
}: {
    currentPeriod: CurrentPeriod | undefined;
    currentTargetPeriod:
    | {
        semester: 1 | 2;
        year: number;
        label: string;
        submissionOpen: boolean;
        submissionWindowLabel: string;
    }
    | undefined;
    hrPanel: HrPanel | null | undefined;
}) {
    const [view, setView] = useState<'review' | 'finalization'>(
        hrPanel?.defaultView ?? 'review',
    );
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
    const [selectedReview, setSelectedReview] = useState<IpcrSubmission | null>(
        null,
    );
    const [selectedFinalize, setSelectedFinalize] =
        useState<IpcrSubmission | null>(null);
    const [hrDecision, setHrDecision] = useState<'correct' | 'incorrect' | ''>(
        '',
    );
    const [hrRemarks, setHrRemarks] = useState('');
    const [periodSemester, setPeriodSemester] = useState<'1' | '2'>(
        submissionSemesterFromLabel(currentPeriod?.label),
    );
    const [periodYear, setPeriodYear] = useState(
        String(currentPeriod?.year ?? new Date().getFullYear()),
    );
    const [periodOpen, setPeriodOpen] = useState(
        currentPeriod?.isOpen ?? false,
    );
    const [savingPeriod, setSavingPeriod] = useState(false);
    const [finalRating, setFinalRating] = useState('');
    const [notifyAllOpen, setNotifyAllOpen] = useState(false);
    const [notifyingAll, setNotifyingAll] = useState(false);

    // Override-period dialog state — used when HR wants to open a period that
    // is not the system-derived next eligible one.
    const nextEligible = currentPeriod?.nextEligible;
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [overrideSemester, setOverrideSemester] = useState<'1' | '2'>(
        nextEligible
            ? (String(nextEligible.semester) as '1' | '2')
            : submissionSemesterFromLabel(currentPeriod?.label),
    );
    const [overrideYear, setOverrideYear] = useState<string>(
        String(nextEligible?.year ?? currentPeriod?.year ?? new Date().getFullYear()),
    );
    const [overrideReasonText, setOverrideReasonText] = useState<string>('');
    const [overrideError, setOverrideError] = useState<string | null>(null);

    function openNextEligiblePeriod(checked: boolean): void {
        setSavingPeriod(true);
        setPeriodOpen(checked);
        const semester = (nextEligible?.semester ?? Number(periodSemester)) as 1 | 2;
        const year = nextEligible?.year ?? Number(periodYear);
        router.post(
            '/admin/ipcr/period',
            {
                label: submissionPeriodLabel(String(semester) as '1' | '2', String(year)),
                year,
                is_open: checked,
            },
            { preserveScroll: true, onFinish: () => setSavingPeriod(false) },
        );
    }

    function submitOverridePeriod(): void {
        setOverrideError(null);
        if (!overrideReasonText.trim()) {
            setOverrideError(
                'Please describe why you need to open this period out of order.',
            );
            return;
        }
        const year = Number(overrideYear);
        if (!Number.isInteger(year) || year < 2020 || year > 2099) {
            setOverrideError('Year must be a 4-digit value between 2020 and 2099.');
            return;
        }
        setSavingPeriod(true);
        router.post(
            '/admin/ipcr/period',
            {
                label: submissionPeriodLabel(overrideSemester, String(year)),
                year,
                is_open: true,
                override_reason: overrideReasonText.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Evaluation period opened.');
                    setOverrideOpen(false);
                    setOverrideReasonText('');
                },
                onError: (errors) => {
                    setOverrideError(
                        (errors.override_reason as string | undefined) ??
                        (errors.year as string | undefined) ??
                        'Could not open the period. Please try again.',
                    );
                },
                onFinish: () => setSavingPeriod(false),
            },
        );
    }

    function notifyAllEmployeesTraining(): void {
        setNotifyingAll(true);

        router.post(
            '/admin/training-suggestions/notify-all',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Global training notification queued.');
                    setNotifyAllOpen(false);
                },
                onError: () => {
                    toast.error('Could not queue training notifications.');
                },
                onFinish: () => setNotifyingAll(false),
            },
        );
    }

    useEffect(() => {
        startTransition(() => {
            setView(hrPanel?.defaultView ?? 'review');
        });
    }, [hrPanel?.defaultView]);

    useEffect(() => {
        startTransition(() => {
            setPeriodSemester(submissionSemesterFromLabel(currentPeriod?.label));
            setPeriodYear(
                String(currentPeriod?.year ?? new Date().getFullYear()),
            );
            setPeriodOpen(currentPeriod?.isOpen ?? false);
        });
    }, [currentPeriod?.isOpen, currentPeriod?.label, currentPeriod?.year]);

    useEffect(() => {
        if (selectedReview) {
            startTransition(() => {
                setHrDecision(
                    selectedReview.stage === 'sent_to_hr'
                        ? ''
                        : ((selectedReview.hr_decision as
                            | 'correct'
                            | 'incorrect'
                            | null) ?? ''),
                );
                setHrRemarks(
                    selectedReview.hr_remarks ??
                    selectedReview.form_payload.workflow_notes.hr_remarks ??
                    '',
                );
            });
        }
    }, [selectedReview]);

    useEffect(() => {
        if (selectedFinalize) {
            startTransition(() => {
                setFinalRating(
                    String(finalDisplayRating(selectedFinalize) ?? ''),
                );
            });
        }
    }, [selectedFinalize]);

    const isReviewView = view === 'review';
    const queueButtonLabel = isReviewView ? 'Review' : 'Finalize';
    const queueEmptyMessage = isReviewView
        ? 'No submissions awaiting HR review.'
        : 'No submissions awaiting finalization.';

    const allQueueSubmissions = [
        ...(hrPanel?.reviewQueue ?? []),
        ...(hrPanel?.finalizationQueue ?? []),
    ];

    const uniquePeriods = (() => {
        const map = new Map<string, { key: string; semester: '1' | '2'; year: string }>();
        const labelFor = (semester: '1' | '2', year: string | number): string =>
            `${semester === '2' ? 'July to December' : 'January to June'} ${year}`;

        let activeSemester: '1' | '2' | null = null;
        let activeYear: number | null = null;

        // Anchor at the active period so it always appears, even with no data yet.
        if (currentPeriod?.label) {
            activeSemester = currentPeriod.label.includes('July to December') ? '2' : '1';
            const yearText = String(currentPeriod.year ?? '').trim() ||
                currentPeriod.label
                    .replace('January to June ', '')
                    .replace('July to December ', '')
                    .trim();
            activeYear = Number(yearText) || null;
            map.set(currentPeriod.label, {
                key: currentPeriod.label,
                semester: activeSemester,
                year: yearText,
            });
        }

        for (const s of allQueueSubmissions) {
            const period = s.form_payload.metadata.period ?? '';
            if (!period || map.has(period)) continue;
            const isS2 = period.includes('July to December');
            const year = period
                .replace('January to June ', '')
                .replace('July to December ', '')
                .trim();
            map.set(period, { key: period, semester: isS2 ? '2' : '1', year });
        }

        // Bridge any gaps so a completed semester remains listed when the
        // active period advances — every (semester, year) from the earliest
        // known period through the active period gets its own row, even when
        // empty. Prevents the new active period from visually replacing the
        // last finalized one.
        if (activeSemester !== null && activeYear !== null) {
            const knownYears = Array.from(map.values())
                .map((p) => Number(p.year))
                .filter((y) => Number.isFinite(y));
            const earliestYear = knownYears.length
                ? Math.min(activeYear, ...knownYears)
                : activeYear;
            const activeSemesterNum = Number(activeSemester);
            for (let y = earliestYear; y <= activeYear; y += 1) {
                for (const sem of ['1', '2'] as const) {
                    if (y === activeYear && Number(sem) > activeSemesterNum) {
                        continue;
                    }
                    const label = labelFor(sem, y);
                    if (!map.has(label)) {
                        map.set(label, { key: label, semester: sem, year: String(y) });
                    }
                }
            }
        }

        return Array.from(map.values()).sort(
            (a, b) =>
                Number(b.year) - Number(a.year) || Number(b.semester) - Number(a.semester),
        );
    })();

    // Filter / pagination state for the outer IPCR Submission Periods table
    const [periodSemesterFilter, setPeriodSemesterFilter] = useState<string>('all');
    const [periodYearFilter, setPeriodYearFilter] = useState<string>('all');
    const [periodRowsPerPage, setPeriodRowsPerPage] = useState(5);
    const [periodCurrentPage, setPeriodCurrentPage] = useState(1);

    const periodYearOptions = Array.from(
        new Set(uniquePeriods.map((p) => p.year)),
    ).sort((a, b) => Number(b) - Number(a));

    const filteredPeriods = uniquePeriods.filter((p) => {
        if (periodSemesterFilter !== 'all' && p.semester !== periodSemesterFilter) return false;
        if (periodYearFilter !== 'all' && p.year !== periodYearFilter) return false;
        return true;
    });

    const periodTotalPages = Math.max(1, Math.ceil(filteredPeriods.length / periodRowsPerPage));
    const periodSafePage = Math.min(periodCurrentPage, periodTotalPages);
    const periodPageStart = (periodSafePage - 1) * periodRowsPerPage;
    const periodPageRows = filteredPeriods.slice(periodPageStart, periodPageStart + periodRowsPerPage);

    useEffect(() => {
        setPeriodCurrentPage(1);
    }, [periodSemesterFilter, periodYearFilter, periodRowsPerPage]);

    useEffect(() => {
        if (periodYearFilter !== 'all' && !periodYearOptions.includes(periodYearFilter)) {
            setPeriodYearFilter('all');
        }
    }, [periodYearOptions, periodYearFilter]);

    const selectedPeriod = uniquePeriods.find((p) => p.key === selectedPeriodKey) ?? null;

    const periodScopedRows = (
        view === 'review'
            ? (hrPanel?.reviewQueue ?? [])
            : (hrPanel?.finalizationQueue ?? [])
    ).filter((s) =>
        selectedPeriod ? (s.form_payload.metadata.period ?? '') === selectedPeriod.key : true,
    );

    // Filter / pagination state for the period detail dialog
    const [hrSearch, setHrSearch] = useState('');
    const [hrStageFilter, setHrStageFilter] = useState<string>('all');
    const [hrAppliedSearch, setHrAppliedSearch] = useState('');
    const [hrAppliedStage, setHrAppliedStage] = useState<string>('all');
    const [hrRowsPerPage, setHrRowsPerPage] = useState(10);
    const [hrCurrentPage, setHrCurrentPage] = useState(1);

    const reviewRows = (() => {
        const term = hrAppliedSearch.trim().toLowerCase();
        return periodScopedRows.filter((s) => {
            if (hrAppliedStage !== 'all' && (s.stage ?? '') !== hrAppliedStage) return false;
            if (!term) return true;
            const name = (s.employee?.name ?? '').toLowerCase();
            const empId = String(s.employee_id ?? '').toLowerCase();
            const job = (s.employee?.job_title ?? '').toLowerCase();
            return name.includes(term) || empId.includes(term) || job.includes(term);
        });
    })();

    const hrTotalPages = Math.max(1, Math.ceil(reviewRows.length / hrRowsPerPage));
    const hrSafePage = Math.min(hrCurrentPage, hrTotalPages);
    const hrPageStart = (hrSafePage - 1) * hrRowsPerPage;

    useEffect(() => {
        setHrCurrentPage(1);
    }, [hrAppliedSearch, hrAppliedStage, hrRowsPerPage, view, selectedPeriodKey]);

    function applyHrFilters(): void {
        setHrAppliedSearch(hrSearch);
        setHrAppliedStage(hrStageFilter);
    }

    function clearHrFilters(): void {
        setHrSearch('');
        setHrStageFilter('all');
        setHrAppliedSearch('');
        setHrAppliedStage('all');
    }


    return (
        <div className="space-y-6">
            <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                <CardHeader className="gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                Performance Evaluation
                            </div>
                            <CardTitle className="text-2xl">
                                HR IPCR Submissions
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-6">
                                Review employee submissions, keep the HR queue
                                aligned with the active cycle, and finalize the
                                IPCR process after PMT review.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                                Period: {currentPeriod?.label ?? 'Not set'}
                            </Badge>
                            <Badge variant="outline">
                                {periodOpen
                                    ? 'Evaluation Period Open'
                                    : 'Evaluation Period Closed'}
                            </Badge>
                            {currentTargetPeriod && (
                                <Badge variant="outline">
                                    Target Cycle: {currentTargetPeriod.label}
                                </Badge>
                            )}
                            <Badge variant="outline">
                                View:{' '}
                                {isReviewView
                                    ? 'IPCR Review'
                                    : 'IPCR Finalization'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <HrStatCard
                            label="Pending Review"
                            value={hrPanel?.stats.pendingReview ?? 0}
                            icon={Clock3}
                            tone="amber"
                        />
                        <HrStatCard
                            label="Pending Finalization"
                            value={hrPanel?.stats.pendingFinalization ?? 0}
                            icon={RotateCcw}
                            tone="emerald"
                        />
                        <HrStatCard
                            label="Queued on Page"
                            value={reviewRows.length}
                            icon={Database}
                            tone="blue"
                        />
                        <HrStatCard
                            label="Escalated"
                            value={hrPanel?.stats.escalated ?? 0}
                            icon={ShieldAlert}
                            tone="red"
                        />
                    </div>
                </CardHeader>
            </Card>

            <Card className="glass-card border-border bg-card shadow-sm">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                                <CardTitle className="text-xl">
                                    Evaluation Period Control
                                </CardTitle>
                            </div>
                            <CardDescription className="max-w-4xl text-sm leading-6">
                                Enable or pause employee submission and
                                evaluator processing. Opening the period
                                triggers notifications to employees and
                                evaluators.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="w-fit">
                            {periodOpen ? 'Period Open' : 'Period Closed'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3 md:items-end">
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Input
                                readOnly
                                value={
                                    nextEligible
                                        ? nextEligible.semester === 1
                                            ? 'January to June'
                                            : 'July to December'
                                        : (submissionSemesterOptions.find(
                                            (o) => o.value === periodSemester,
                                        )?.label ?? 'January to June')
                                }
                                className="border-border bg-muted/40 cursor-not-allowed"
                                aria-label="Next eligible semester"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="period-year">Year</Label>
                            <Input
                                id="period-year"
                                readOnly
                                value={String(nextEligible?.year ?? periodYear)}
                                className="border-border bg-muted/40 cursor-not-allowed"
                                aria-label="Next eligible year"
                            />
                        </div>
                        <div className="flex items-center gap-3 pb-0.5">
                            <Switch
                                id="period-status"
                                checked={currentPeriod?.isOpen ?? false}
                                onCheckedChange={openNextEligiblePeriod}
                                disabled={savingPeriod}
                            />
                            <Label htmlFor="period-status" className="cursor-pointer select-none">
                                {savingPeriod ? 'Saving…' : (currentPeriod?.isOpen ? 'Open' : 'Closed')}
                            </Label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            The semester and year auto-advance based on the
                            last closed period. To open a different period
                            (e.g. re-run an earlier one), you must record a
                            reason.
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setOverrideSemester(
                                    nextEligible
                                        ? (String(nextEligible.semester) as '1' | '2')
                                        : periodSemester,
                                );
                                setOverrideYear(
                                    String(nextEligible?.year ?? periodYear),
                                );
                                setOverrideReasonText('');
                                setOverrideError(null);
                                setOverrideOpen(true);
                            }}
                            disabled={savingPeriod}
                        >
                            Open a different period…
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Open evaluation period out of order</DialogTitle>
                        <DialogDescription>
                            {nextEligible ? (
                                <>
                                    The next eligible period is{' '}
                                    <strong>{nextEligible.label}</strong>. Choose
                                    a different semester/year and provide a reason
                                    — this will be recorded against the period for
                                    audit.
                                </>
                            ) : (
                                <>
                                    Choose a semester/year and provide a reason —
                                    this will be recorded against the period for
                                    audit.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select
                                value={overrideSemester}
                                onValueChange={(value) =>
                                    setOverrideSemester(value === '2' ? '2' : '1')
                                }
                            >
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {submissionSemesterOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="period-override-year">Year</Label>
                            <Input
                                id="period-override-year"
                                type="number"
                                min={2020}
                                max={2099}
                                value={overrideYear}
                                onChange={(e) => setOverrideYear(e.target.value)}
                                className="border-border bg-background"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="period-override-reason">
                            Reason (required)
                        </Label>
                        <textarea
                            id="period-override-reason"
                            value={overrideReasonText}
                            onChange={(e) => setOverrideReasonText(e.target.value)}
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="e.g. Re-running Sem 2 2025 because submissions were delayed by the system migration."
                        />
                        {overrideError ? (
                            <p className="text-xs text-destructive">{overrideError}</p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOverrideOpen(false)}
                            disabled={savingPeriod}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={submitOverridePeriod}
                            disabled={savingPeriod || !overrideReasonText.trim()}
                        >
                            {savingPeriod ? 'Opening…' : 'Confirm & open period'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 sm:grid-cols-2">
                <IpcrPeriodExtensions
                    type="evaluation"
                    closedPeriods={hrPanel?.closedPeriods ?? []}
                    extensions={hrPanel?.extensions ?? []}
                />

                <IpcrHistoricalEntry type="evaluation" />
            </div>

            <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border bg-card">
                    <CardTitle className="text-lg">IPCR Submission Periods</CardTitle>
                    <CardDescription className="mt-1">
                        Select a period to review or finalize employee IPCR submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 w-1/2">
                        <div className="space-y-1.5">
                            <Label className="text-xs tracking-wider text-muted-foreground uppercase">
                                Semester
                            </Label>
                            <Select
                                value={periodSemesterFilter}
                                onValueChange={setPeriodSemesterFilter}
                            >
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue placeholder="All semesters" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Semesters</SelectItem>
                                    <SelectItem value="1">First Semester (Jan–Jun)</SelectItem>
                                    <SelectItem value="2">Second Semester (Jul–Dec)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs tracking-wider text-muted-foreground uppercase">
                                Year
                            </Label>
                            <Select
                                value={periodYearFilter}
                                onValueChange={setPeriodYearFilter}
                            >
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue placeholder="All years" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {periodYearOptions.map((year) => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-[18px] border border-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                    <th>Semester</th>
                                    <th>Year</th>
                                    <th>In Review</th>
                                    <th>Finalized</th>
                                    <th className="!text-center">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {periodPageRows.map((period, index) => {
                                    const inReview = (hrPanel?.reviewQueue ?? []).filter(
                                        (s) => (s.form_payload.metadata.period ?? '') === period.key,
                                    ).length;
                                    const finalized = (hrPanel?.finalizationQueue ?? []).filter(
                                        (s) => (s.form_payload.metadata.period ?? '') === period.key,
                                    ).length;
                                    return (
                                        <tr
                                            key={period.key}
                                            className={cn(
                                                'text-sm font-semibold text-foreground',
                                                stripedTableRows[index % 2],
                                            )}
                                        >
                                            <td className="px-5 py-3.5">
                                                {period.semester === '1'
                                                    ? 'First Semester (Jan–Jun)'
                                                    : 'Second Semester (Jul–Dec)'}
                                            </td>
                                            <td className="px-5 py-3.5">{period.year}</td>
                                            <td className="px-5 py-3.5">{inReview}</td>
                                            <td className="px-5 py-3.5">{finalized}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedPeriodKey(period.key)}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPeriods.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                        >
                                            {uniquePeriods.length === 0
                                                ? 'No IPCR submissions found.'
                                                : 'No periods match the selected filters.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="app-table-pagination-bar">
                        <div className="app-table-pagination-shell">
                            <div className="app-table-pagination-page-size">
                                <span>Rows per page</span>
                                <Select
                                    value={String(periodRowsPerPage)}
                                    onValueChange={(value) => setPeriodRowsPerPage(Number(value))}
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
                                    Page {periodSafePage} of {periodTotalPages}
                                </span>
                                <Pagination className="app-table-pagination-nav">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    setPeriodCurrentPage((p) => Math.max(1, p - 1));
                                                }}
                                                className={periodSafePage === 1 ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    setPeriodCurrentPage((p) => Math.min(periodTotalPages, p + 1));
                                                }}
                                                className={periodSafePage === periodTotalPages ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog
                open={selectedPeriodKey !== null}
                onOpenChange={(open) => !open && setSelectedPeriodKey(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPeriod?.semester === '1'
                                ? 'First Semester (Jan–Jun)'
                                : 'Second Semester (Jul–Dec)'}{' '}
                            {selectedPeriod?.year}
                        </DialogTitle>
                        <DialogDescription>
                            Review or finalize employee IPCR submissions for this period.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={isReviewView ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                                isReviewView &&
                                'bg-[#8CC37C] text-[#10241b] hover:bg-[#7fb76e] dark:bg-[#9ac68e] dark:text-[#10241b] dark:hover:bg-[#8cbf7c]',
                            )}
                            onClick={() => setView('review')}
                        >
                            <FileSpreadsheet className="size-4" />
                            Review
                        </Button>
                        <Button
                            type="button"
                            variant={isReviewView ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                                !isReviewView &&
                                'bg-[#8CC37C] text-[#10241b] hover:bg-[#7fb76e] dark:bg-[#9ac68e] dark:text-[#10241b] dark:hover:bg-[#8cbf7c]',
                            )}
                            onClick={() => setView('finalization')}
                        >
                            <FileCheck2 className="size-4" />
                            Finalized
                        </Button>
                    </div>
                    {!isReviewView && (
                        <div className="flex items-center justify-between gap-4 rounded-[20px] border border-brand-300 bg-brand-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                            <div>
                                <p className="text-sm font-semibold">Notify all employees</p>
                                <p className="text-xs text-muted-foreground">
                                    Send a global training recommendation notification to every employee.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => setNotifyAllOpen(true)}
                            >
                                <Megaphone className="size-4" />
                                Notify Training (All)
                            </Button>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={hrSearch}
                                    onChange={(event) => setHrSearch(event.target.value)}
                                    placeholder="Search employee name, ID, or position"
                                    className="border-border bg-background pl-9"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            applyHrFilters();
                                        }
                                    }}
                                />
                            </div>
                            <Select value={hrStageFilter} onValueChange={setHrStageFilter}>
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue placeholder="Filter by stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    <SelectItem value="sent_to_hr">Sent To HR</SelectItem>
                                    <SelectItem value="sent_to_pmt">Sent To PMT</SelectItem>
                                    <SelectItem value="sent_to_hr_finalize">For Finalization</SelectItem>
                                    <SelectItem value="finalized">Finalized</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" onClick={applyHrFilters}>
                                <Filter className="size-4" />
                                Apply Filters
                            </Button>
                            <Button type="button" variant="ghost" onClick={clearHrFilters}>
                                Clear
                            </Button>
                            <Badge variant="outline" className="ml-auto shrink-0">
                                {reviewRows.length} Record{reviewRows.length === 1 ? '' : 's'}
                            </Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                        <th className="!w-10 !text-center">Rank</th>
                                        <th>Employee</th>
                                        <th>Status</th>
                                        <th>Stage</th>
                                        <th>Rating</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const withRatings = reviewRows
                                            .filter((s) => finalDisplayRating(s) !== null)
                                            .sort((a, b) => (finalDisplayRating(b) ?? 0) - (finalDisplayRating(a) ?? 0));
                                        const withoutRatings = reviewRows.filter((s) => finalDisplayRating(s) === null);
                                        const ranked = [...withRatings, ...withoutRatings];
                                        const total = withRatings.length;
                                        const paged = ranked.slice(hrPageStart, hrPageStart + hrRowsPerPage);

                                        return paged.map((submission, pageIndex) => {
                                            const index = hrPageStart + pageIndex;
                                            const rank = index + 1;
                                            const hasRating = finalDisplayRating(submission) !== null;
                                            const isTopThree = hasRating && rank <= 3;
                                            const isBottomThree = hasRating && rank > total - 3 && total > 3;

                                            return (
                                                <tr
                                                    key={submission.id}
                                                    className={cn(
                                                        'text-sm font-semibold text-foreground',
                                                        stripedTableRows[index % 2],
                                                    )}
                                                >
                                                    <td className="px-5 py-3.5 text-center">
                                                        {hasRating ? (
                                                            <span className={cn(
                                                                'inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                                                                isTopThree
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                    : isBottomThree
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                                        : 'bg-muted text-muted-foreground',
                                                            )}>
                                                                {rank}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div>
                                                            <p className="font-medium">
                                                                {submission.employee?.name ??
                                                                    submission.employee_id}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {submission.employee?.job_title ??
                                                                    'Administrative Office'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {statusLabel(submission.status)}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {stageLabel(submission.stage)}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={cn(
                                                            'font-mono',
                                                            isTopThree ? 'text-emerald-600 dark:text-emerald-400' : isBottomThree ? 'text-red-600 dark:text-red-400' : '',
                                                        )}>
                                                            {finalDisplayRating(submission)?.toFixed(2) ?? 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (isReviewView) {
                                                                        setSelectedReview(submission);
                                                                    } else {
                                                                        setSelectedFinalize(submission);
                                                                    }
                                                                }}
                                                            >
                                                                {isReviewView
                                                                    ? submission.stage === 'sent_to_hr'
                                                                        ? queueButtonLabel
                                                                        : 'View Review'
                                                                    : submission.stage === 'sent_to_hr_finalize'
                                                                        ? queueButtonLabel
                                                                        : 'View Finalization'}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                    {reviewRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                            >
                                                {queueEmptyMessage}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="app-table-pagination-bar">
                            <div className="app-table-pagination-shell">
                                <div className="app-table-pagination-page-size">
                                    <span>Rows per page</span>
                                    <Select
                                        value={String(hrRowsPerPage)}
                                        onValueChange={(value) => setHrRowsPerPage(Number(value))}
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
                                        Page {hrSafePage} of {hrTotalPages}
                                    </span>
                                    <Pagination className="app-table-pagination-nav">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setHrCurrentPage((p) => Math.max(1, p - 1));
                                                    }}
                                                    className={hrSafePage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setHrCurrentPage((p) => Math.min(hrTotalPages, p + 1));
                                                    }}
                                                    className={hrSafePage === hrTotalPages ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPeriodKey(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={notifyAllOpen}
                onOpenChange={(open) => !notifyingAll && setNotifyAllOpen(open)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Notify all employees?</DialogTitle>
                        <DialogDescription>
                            This will send a training recommendation notification to every employee account. Employees already notified today will be skipped automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={notifyingAll}
                            onClick={() => setNotifyAllOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button disabled={notifyingAll} onClick={notifyAllEmployeesTraining}>
                            {notifyingAll ? 'Queuing…' : 'Notify All'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={selectedReview !== null}
                onOpenChange={(open) => !open && setSelectedReview(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedReview &&
                        (() => {
                            const isReviewEditable =
                                selectedReview.stage === 'sent_to_hr';

                            return (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {isReviewEditable
                                                ? 'HR Review'
                                                : 'HR Review Snapshot'}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {selectedReview.employee?.name ??
                                                selectedReview.employee_id}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <IpcrPaperForm
                                        value={selectedReview.form_payload}
                                        mode="review"
                                    />
                                    {!isReviewEditable && (
                                        <div className="rounded-[24px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                            This IPCR has already moved past HR
                                            review. You can inspect the saved
                                            review details here, but it can no
                                            longer be changed from this dialog.
                                        </div>
                                    )}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Decision</Label>
                                            <Select
                                                value={hrDecision || 'none'}
                                                onValueChange={(value) =>
                                                    setHrDecision(
                                                        value === 'none'
                                                            ? ''
                                                            : (value as
                                                                | 'correct'
                                                                | 'incorrect'),
                                                    )
                                                }
                                                disabled={!isReviewEditable}
                                            >
                                                <SelectTrigger className="border-border bg-background">
                                                    <SelectValue placeholder="Select a decision" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        Select a decision
                                                    </SelectItem>
                                                    <SelectItem value="correct">
                                                        Correct – Return to Employee
                                                    </SelectItem>
                                                    <SelectItem value="incorrect">
                                                        Incorrect – Return to Evaluator
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>HR Remarks</Label>
                                            <Textarea
                                                value={hrRemarks}
                                                onChange={(event) =>
                                                    setHrRemarks(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Required when returning the evaluation to the evaluator."
                                                className="min-h-28 border-border bg-background"
                                                readOnly={!isReviewEditable}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedReview(null)
                                            }
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={
                                                !isReviewEditable ||
                                                !hrDecision ||
                                                (hrDecision === 'incorrect' &&
                                                    !hrRemarks.trim())
                                            }
                                            onClick={() => {
                                                router.post(
                                                    `/ipcr/hr-review/${selectedReview.id}`,
                                                    {
                                                        hr_decision: hrDecision,
                                                        hr_remarks:
                                                            hrDecision ===
                                                                'incorrect'
                                                                ? hrRemarks.trim()
                                                                : null,
                                                    },
                                                    {
                                                        onSuccess: () => {
                                                            setSelectedReview(
                                                                null,
                                                            );
                                                            setHrDecision('');
                                                            setHrRemarks('');
                                                        },
                                                    },
                                                );
                                            }}
                                        >
                                            {isReviewEditable
                                                ? 'Save HR Review'
                                                : 'Review Already Recorded'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            );
                        })()}
                </DialogContent>
            </Dialog>

            <Dialog
                open={selectedFinalize !== null}
                onOpenChange={(open) => !open && setSelectedFinalize(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedFinalize &&
                        (() => {
                            const isFinalizeEditable =
                                selectedFinalize.stage ===
                                'sent_to_hr_finalize';

                            return (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {isFinalizeEditable
                                                ? 'HR Finalization'
                                                : 'Finalized IPCR Snapshot'}
                                        </DialogTitle>
                                        <DialogDescription>
                                            Record the final rating after PMT
                                            review.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <IpcrPaperForm
                                        value={selectedFinalize.form_payload}
                                        mode="review"
                                    />
                                    {!isFinalizeEditable && (
                                        <div className="rounded-[24px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                            This IPCR has already been
                                            finalized. The dialog stays
                                            available so HR can reopen the saved
                                            finalization snapshot anytime.
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedFinalize(null)
                                            }
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={
                                                !isFinalizeEditable ||
                                                !finalRating
                                            }
                                            onClick={() => {
                                                router.post(
                                                    `/ipcr/finalize/${selectedFinalize.id}`,
                                                    {
                                                        final_rating:
                                                            Number(finalRating),
                                                    },
                                                    {
                                                        onSuccess: () => {
                                                            setSelectedFinalize(
                                                                null,
                                                            );
                                                            setFinalRating('');
                                                        },
                                                    },
                                                );
                                            }}
                                        >
                                            {isFinalizeEditable
                                                ? 'Finalize IPCR'
                                                : 'Already Finalized'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            );
                        })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PmtOverview({ pmtPanel }: { pmtPanel: PmtPanel | null | undefined }) {
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] =
        useState<IpcrSubmission | null>(null);
    const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (selectedSubmission) {
            startTransition(() => {
                setDecision('');
                setRemarks(selectedSubmission.pmt_remarks ?? '');
            });
        }
    }, [selectedSubmission]);

    const allSubmissions = pmtPanel?.submissions ?? [];

    const uniquePeriods = Array.from(
        new Map(
            allSubmissions.map((s) => {
                const period = s.form_payload.metadata.period ?? '';
                const isS2 = period.includes('July to December');
                const year = period.replace('January to June ', '').replace('July to December ', '').trim();
                return [period, { key: period, semester: isS2 ? '2' : '1', year }] as const;
            }),
        ).values(),
    ).sort((a, b) => Number(b.year) - Number(a.year) || Number(b.semester) - Number(a.semester));

    const selectedPeriod = uniquePeriods.find((p) => p.key === selectedPeriodKey) ?? null;

    const periodScopedRows = allSubmissions.filter((s) =>
        selectedPeriod ? (s.form_payload.metadata.period ?? '') === selectedPeriod.key : true,
    );

    const [pmtSearch, setPmtSearch] = useState('');
    const [pmtAppealFilter, setPmtAppealFilter] = useState<string>('all');
    const [pmtAppliedSearch, setPmtAppliedSearch] = useState('');
    const [pmtAppliedAppeal, setPmtAppliedAppeal] = useState<string>('all');
    const [pmtRowsPerPage, setPmtRowsPerPage] = useState(10);
    const [pmtCurrentPage, setPmtCurrentPage] = useState(1);

    const periodRows = (() => {
        const term = pmtAppliedSearch.trim().toLowerCase();
        return periodScopedRows.filter((s) => {
            const isAppealed = s.appeal_status === 'appealed' || s.appeal_status === 'submitted';
            if (pmtAppliedAppeal === 'appealed' && !isAppealed) return false;
            if (pmtAppliedAppeal === 'no_appeal' && isAppealed) return false;
            if (!term) return true;
            const name = (s.employee?.name ?? '').toLowerCase();
            const empId = String(s.employee_id ?? '').toLowerCase();
            return name.includes(term) || empId.includes(term);
        });
    })();

    const pmtTotalPages = Math.max(1, Math.ceil(periodRows.length / pmtRowsPerPage));
    const pmtSafePage = Math.min(pmtCurrentPage, pmtTotalPages);
    const pmtPageStart = (pmtSafePage - 1) * pmtRowsPerPage;
    const pmtPageRows = periodRows.slice(pmtPageStart, pmtPageStart + pmtRowsPerPage);

    useEffect(() => {
        setPmtCurrentPage(1);
    }, [pmtAppliedSearch, pmtAppliedAppeal, pmtRowsPerPage, selectedPeriodKey]);

    function applyPmtFilters(): void {
        setPmtAppliedSearch(pmtSearch);
        setPmtAppliedAppeal(pmtAppealFilter);
    }

    function clearPmtFilters(): void {
        setPmtSearch('');
        setPmtAppealFilter('all');
        setPmtAppliedSearch('');
        setPmtAppliedAppeal('all');
    }

    return (
        <div className="space-y-6">
            <Card className="glass-card border-border bg-card shadow-sm">
                <CardHeader className="space-y-5">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                            <FileSpreadsheet className="size-3.5" />
                            Performance Evaluation
                        </div>
                        <CardTitle className="text-2xl">
                            PMT IPCR Overview
                        </CardTitle>
                        <CardDescription>
                            PMT review queue with appeal context and the saved
                            Administrative Office IPCR form snapshot.
                        </CardDescription>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            label="Pending Review"
                            value={pmtPanel?.stats.pendingReview ?? 0}
                        />
                        <StatCard
                            label="Appealed"
                            value={pmtPanel?.stats.appealed ?? 0}
                            tone="sky"
                        />
                        <StatCard
                            label="Returned"
                            value={pmtPanel?.stats.returnedForReevaluation ?? 0}
                            tone="amber"
                        />
                    </div>
                </CardHeader>
            </Card>

            <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border bg-card">
                    <CardTitle>Submission Periods</CardTitle>
                    <CardDescription className="mt-1">
                        Select a period to review employee IPCR submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                    <th>Semester</th>
                                    <th>Year</th>
                                    <th>Pending Review</th>
                                    <th className="!text-center">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniquePeriods.map((period, index) => {
                                    const pending = allSubmissions.filter(
                                        (s) => (s.form_payload.metadata.period ?? '') === period.key,
                                    ).length;
                                    return (
                                        <tr
                                            key={period.key}
                                            className={cn(
                                                'text-sm font-semibold text-foreground',
                                                stripedTableRows[index % 2],
                                            )}
                                        >
                                            <td className="px-5 py-3.5">
                                                {period.semester === '1'
                                                    ? 'First Semester (Jan–Jun)'
                                                    : 'Second Semester (Jul–Dec)'}
                                            </td>
                                            <td className="px-5 py-3.5">{period.year}</td>
                                            <td className="px-5 py-3.5">
                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                    {pending} pending
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedPeriodKey(period.key)}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {uniquePeriods.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                        >
                                            No IPCR submissions pending PMT review.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Period submissions dialog */}
            <Dialog
                open={selectedPeriodKey !== null}
                onOpenChange={(open) => !open && setSelectedPeriodKey(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPeriod?.semester === '1'
                                ? 'First Semester (Jan–Jun)'
                                : 'Second Semester (Jul–Dec)'}{' '}
                            {selectedPeriod?.year}
                        </DialogTitle>
                        <DialogDescription>
                            Review employee IPCR submissions for this period.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={pmtSearch}
                                    onChange={(event) => setPmtSearch(event.target.value)}
                                    placeholder="Search employee name or ID"
                                    className="border-border bg-background pl-9"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            applyPmtFilters();
                                        }
                                    }}
                                />
                            </div>
                            <Select value={pmtAppealFilter} onValueChange={setPmtAppealFilter}>
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue placeholder="Filter by appeal status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="appealed">Appealed</SelectItem>
                                    <SelectItem value="no_appeal">No Appeal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" onClick={applyPmtFilters}>
                                <Filter className="size-4" />
                                Apply Filters
                            </Button>
                            <Button type="button" variant="ghost" onClick={clearPmtFilters}>
                                Clear
                            </Button>
                            <Badge variant="outline" className="ml-auto shrink-0">
                                {periodRows.length} Record{periodRows.length === 1 ? '' : 's'}
                            </Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10">
                                        <th>Employee</th>
                                        <th>Appeal</th>
                                        <th>Stage</th>
                                        <th>Rating</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pmtPageRows.map((submission, index) => (
                                        <tr
                                            key={submission.id}
                                            className={cn(
                                                'text-sm font-semibold text-foreground',
                                                stripedTableRows[index % 2],
                                            )}
                                        >
                                            <td className="px-5 py-3.5">
                                                {submission.employee?.name ?? submission.employee_id}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {submission.appeal_status === 'appealed' ||
                                                    submission.appeal_status === 'submitted'
                                                    ? 'Appealed'
                                                    : 'No Appeal'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {stageLabel(submission.stage)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {submission.performance_rating?.toFixed(2) ?? 'Pending'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setSelectedSubmission(submission)}
                                                >
                                                    Open Review
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {periodRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                            >
                                                No submissions match the filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="app-table-pagination-bar">
                            <div className="app-table-pagination-shell">
                                <div className="app-table-pagination-page-size">
                                    <span>Rows per page</span>
                                    <Select
                                        value={String(pmtRowsPerPage)}
                                        onValueChange={(value) => setPmtRowsPerPage(Number(value))}
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
                                        Page {pmtSafePage} of {pmtTotalPages}
                                    </span>
                                    <Pagination className="app-table-pagination-nav">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setPmtCurrentPage((p) => Math.max(1, p - 1));
                                                    }}
                                                    className={pmtSafePage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setPmtCurrentPage((p) => Math.min(pmtTotalPages, p + 1));
                                                    }}
                                                    className={pmtSafePage === pmtTotalPages ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPeriodKey(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={selectedSubmission !== null}
                onOpenChange={(open) => !open && setSelectedSubmission(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    {selectedSubmission && (
                        <>
                            <DialogHeader>
                                <DialogTitle>PMT Review</DialogTitle>
                                <DialogDescription>
                                    Review the employee submission, appeal
                                    details, and supporting evidence before
                                    routing the next action.
                                </DialogDescription>
                            </DialogHeader>
                            <IpcrPaperForm
                                value={selectedSubmission.form_payload}
                                mode="review"
                            />
                            {selectedSubmission.appeal?.appeal_reason && (
                                <div className="glass-card rounded-xl border border-border bg-card p-4 shadow-sm">
                                    <p className="text-sm font-semibold">
                                        Appeal Details
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {
                                            selectedSubmission.appeal
                                                .appeal_reason
                                        }
                                    </p>
                                    {(selectedSubmission.appeal.evidence_files
                                        ?.length ?? 0) > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                    Attached Evidence
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(selectedSubmission.appeal.evidence_files ?? []).map(
                                                        (file, index) => (
                                                            <Button
                                                                key={`${file}-${index}`}
                                                                asChild
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                            >
                                                                <a
                                                                    href={getAppealEvidenceUrl(
                                                                        selectedSubmission
                                                                            .appeal!.id,
                                                                        index,
                                                                    )}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    {getFileName(file)}
                                                                </a>
                                                            </Button>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>PMT Decision</Label>
                                    <Select
                                        value={decision || 'none'}
                                        onValueChange={(value) =>
                                            setDecision(
                                                value === 'none'
                                                    ? ''
                                                    : (value as
                                                        | 'approved'
                                                        | 'rejected'),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="border-border bg-background">
                                            <SelectValue placeholder="Select a decision" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Select a decision
                                            </SelectItem>
                                            <SelectItem value="approved">
                                                Approve
                                            </SelectItem>
                                            <SelectItem value="rejected">
                                                Return to Evaluator
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>PMT Remarks</Label>
                                    <Textarea
                                        value={remarks}
                                        onChange={(event) =>
                                            setRemarks(event.target.value)
                                        }
                                        placeholder="Required when returning to the evaluator."
                                        className="min-h-28 border-border bg-background"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedSubmission(null)}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        !decision ||
                                        (decision === 'rejected' &&
                                            !remarks.trim())
                                    }
                                    onClick={() => {
                                        router.post(
                                            `/ipcr/pmt-review/${selectedSubmission.id}`,
                                            {
                                                pmt_decision: decision,
                                                pmt_remarks:
                                                    decision === 'rejected'
                                                        ? remarks.trim()
                                                        : null,
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
    const {
        roleView,
        currentPeriod,
        currentTargetPeriod,
        latestSubmission,
        employeePanel,
        evaluatorPanel,
        hrPanel,
        pmtPanel,
    } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Performance Evaluation',
            href:
                roleView === 'employee'
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
                    <EvaluatorOverview
                        currentPeriod={currentPeriod}
                        evaluatorPanel={evaluatorPanel}
                    />
                )}
                {roleView === 'hr' && (
                    <HrOverview
                        currentPeriod={currentPeriod}
                        currentTargetPeriod={currentTargetPeriod}
                        hrPanel={hrPanel}
                    />
                )}
                {roleView === 'pmt' && <PmtOverview pmtPanel={pmtPanel} />}
            </div>
        </AppLayout>
    );
}
