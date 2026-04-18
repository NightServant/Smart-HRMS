import { Link, router, usePage } from '@inertiajs/react';
import { FileCheck2, Clock3, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { submitIpcr } from '@/actions/App/Http/Controllers/IwrController';
import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
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
import type {
    IpcrFormPayload,
    IpcrSubmission,
    IpcrTarget,
    User,
} from '@/types';

type PageProps = {
    auth: { user: User & { employee_id?: string } };
    currentPeriod: { label: string; year: number; isOpen: boolean };
    periodOpen: boolean;
    canStartNewSubmission: boolean;
    draftFormPayload: IpcrFormPayload | null;
    latestSubmission: IpcrSubmission | null;
};

type SubmitCardProps = {
    currentTarget?: IpcrTarget | null;
};

type SubmissionStepStatus = 'completed' | 'current' | 'pending';

function SubmissionCycleStepper({
    hasSubmission,
    hasDraft,
    periodOpen,
}: {
    hasSubmission: boolean;
    hasDraft: boolean;
    periodOpen: boolean;
}) {
    const steps = [
        {
            key: 'planning',
            label: 'Planning',
            desc: { completed: 'Planning phase complete', current: 'Period is open for submission', pending: 'Period not yet open' },
        },
        {
            key: 'draft',
            label: 'Draft',
            desc: { completed: 'Draft completed', current: 'Draft in progress', pending: 'Not yet started' },
        },
        {
            key: 'submitted',
            label: 'Submitted',
            desc: { completed: 'IPCR submitted', current: 'IPCR submitted for review', pending: 'Pending submission' },
        },
        {
            key: 'workflow',
            label: 'Under Review',
            desc: { completed: 'Workflow complete', current: 'Moving through review workflow', pending: 'Pending workflow' },
        },
        {
            key: 'finalized',
            label: 'Finalized',
            desc: { completed: 'IPCR finalized', current: 'Ready for finalization', pending: 'Awaiting finalization' },
        },
    ] as const;

    const currentStep = hasSubmission
        ? 3
        : hasDraft
          ? 1
          : periodOpen
            ? 0
            : -1;

    const stepStyles: Record<SubmissionStepStatus, { panel: string; line: string; title: string; icon: string }> = {
        completed: {
            panel: 'border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30',
            line: 'bg-emerald-400 dark:bg-emerald-700',
            title: 'text-emerald-800 dark:text-emerald-300',
            icon: 'text-emerald-600 dark:text-emerald-400',
        },
        current: {
            panel: 'border-blue-300 bg-blue-50/90 dark:border-blue-800 dark:bg-blue-950/30',
            line: 'bg-blue-300 dark:bg-blue-800',
            title: 'text-blue-800 dark:text-blue-300',
            icon: 'text-blue-600 dark:text-blue-400',
        },
        pending: {
            panel: 'border-border bg-muted/20',
            line: 'bg-border',
            title: 'text-foreground',
            icon: 'text-muted-foreground',
        },
    };

    function resolveStatus(stepIndex: number): SubmissionStepStatus {
        if (currentStep < 0) {
            return stepIndex === 0 ? 'current' : 'pending';
        }
        if (stepIndex < currentStep) return 'completed';
        if (stepIndex === currentStep) return 'current';
        return 'pending';
    }

    const renderStep = (step: (typeof steps)[number], index: number) => {
        const status = resolveStatus(index);
        const s = stepStyles[status];
        const isLast = index === steps.length - 1;
        const Icon = status === 'completed' ? FileCheck2 : Clock3;
        return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${s.panel}`}>
                        <Icon className={`size-4 ${s.icon} ${status === 'current' ? 'animate-pulse' : ''}`} />
                    </div>
                    {!isLast && (
                        <div className={`ml-2 hidden h-0.5 flex-1 rounded-full sm:block ${s.line}`} />
                    )}
                </div>
                <div className={`mt-3 h-full rounded-2xl border p-3 ${s.panel}`}>
                    <p className={`text-sm font-semibold ${s.title}`}>{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.desc[status]}</p>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:hidden">
                {steps.map((step, index) => renderStep(step, index))}
            </div>
            <div className="hidden sm:flex sm:items-start sm:gap-2">
                {steps.map((step, index) => renderStep(step, index))}
            </div>
        </>
    );
}

function allActualAccomplishmentsFilled(
    formPayload: IpcrFormPayload | null,
): boolean {
    if (!formPayload) {
        return false;
    }

    return formPayload.sections.every((section) =>
        section.rows.every(
            (row) => (row.actual_accomplishment ?? '').trim().length > 0,
        ),
    );
}

export default function SubmitCard({ currentTarget = null }: SubmitCardProps) {
    const {
        auth,
        currentPeriod,
        periodOpen,
        canStartNewSubmission,
        draftFormPayload,
        latestSubmission,
    } = usePage<PageProps>().props;

    const [formPayload, setFormPayload] = useState<IpcrFormPayload | null>(
        draftFormPayload,
    );
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setFormPayload(draftFormPayload);
    }, [draftFormPayload]);

    const canEditSubmission = periodOpen && canStartNewSubmission;
    const isViewingActiveSubmission = Boolean(
        latestSubmission && !canStartNewSubmission,
    );
    const canSubmit =
        periodOpen &&
        canStartNewSubmission &&
        auth.user.employee_id &&
        allActualAccomplishmentsFilled(formPayload) &&
        !processing;

    const hasSubmission = Boolean(
        latestSubmission && latestSubmission.stage !== 'finalized',
    );
    const hasDraft = Boolean(formPayload && !latestSubmission);

    const submissionStatusLabel = latestSubmission
        ? latestSubmission.status ?? 'In Progress'
        : formPayload
          ? 'Draft'
          : 'Not Started';

    const summaryText = useMemo(() => {
        if (!periodOpen) {
            return 'The evaluation period is currently closed. You can preview the form below, but editing and submission stay disabled until HR opens the period.';
        }

        if (!latestSubmission) {
            return 'Draft a new submission for the current period.';
        }

        if (latestSubmission.stage === 'finalized') {
            return 'Your previous IPCR has been finalized. You can start a new cycle when the period is open.';
        }

        return (
            latestSubmission.notification ??
            'Your IPCR is currently moving through the workflow.'
        );
    }, [latestSubmission, periodOpen]);

    function handleSubmit(): void {
        if (!auth.user.employee_id || !formPayload) {
            return;
        }

        setProcessing(true);

        router.post(
            submitIpcr.url(),
            {
                employee_id: auth.user.employee_id,
                period: currentPeriod.label,
                form_payload: formPayload,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <div className="grid min-w-0 gap-6">
            <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <Send className="size-3.5" />
                                Performance Evaluation
                            </div>
                            <CardTitle className="text-2xl">
                                IPCR Submission
                            </CardTitle>
                            <CardDescription className="max-w-3xl text-sm leading-6">
                                {summaryText}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                                Period: {currentPeriod.label}
                            </Badge>
                            <Badge className={periodOpen
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}>
                                {periodOpen ? 'Period Open' : 'Period Closed'}
                            </Badge>
                            {submissionStatusLabel === 'In Progress' || (latestSubmission && latestSubmission.stage !== 'finalized') ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                    Status: {submissionStatusLabel}
                                </Badge>
                            ) : (
                                <Badge variant="outline">
                                    Status: {submissionStatusLabel}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <SubmissionCycleStepper
                        hasSubmission={hasSubmission}
                        hasDraft={hasDraft}
                        periodOpen={periodOpen}
                    />

                    {latestSubmission && (
                        <IpcrWorkflowStepper
                            stage={latestSubmission.stage}
                            status={latestSubmission.status}
                            isEscalated={latestSubmission.is_escalated}
                        />
                    )}

                    {latestSubmission?.is_escalated && (
                        <EscalationWarning
                            reason={latestSubmission.escalation_reason}
                        />
                    )}

                    {(latestSubmission?.appeal_status === 'appeal_window_open' ||
                        latestSubmission?.stage === 'appeal_window_open') &&
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
                                            href={latestSubmission.appeal_url}
                                        >
                                            Open Appeal
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                </CardHeader>

                <CardContent className="space-y-5">
                    {isViewingActiveSubmission && latestSubmission ? (
                        <IpcrPaperForm
                            value={latestSubmission.form_payload}
                            mode="review"
                        />
                    ) : formPayload ? (
                        <>
                            <IpcrPaperForm
                                value={formPayload}
                                mode={canEditSubmission ? 'employee' : 'review'}
                                onChange={
                                    canEditSubmission ? setFormPayload : undefined
                                }
                                currentTarget={currentTarget}
                            />
                            {!canEditSubmission && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                    The evaluation period is closed right now.
                                    You can preview the form, but editing and
                                    submission stay disabled until HR opens the
                                    period.
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                    {canEditSubmission && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() =>
                                                    setFormPayload(draftFormPayload)
                                                }
                                                disabled={processing}
                                            >
                                                Reset Draft
                                            </Button>
                                            <Button
                                                type="button"
                                                className="w-full sm:w-auto"
                                                disabled={!canSubmit}
                                                onClick={handleSubmit}
                                            >
                                                {processing
                                                    ? 'Submitting...'
                                                    : 'Submit IPCR'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {canEditSubmission && !allActualAccomplishmentsFilled(formPayload) ? (
                                    <p className="text-right text-xs text-amber-600 dark:text-amber-400">
                                        All actual accomplishments must be filled before submitting.
                                    </p>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                            No employee profile is linked to this account yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
