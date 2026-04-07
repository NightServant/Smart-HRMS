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
        { key: 'planning', label: 'Planning' },
        { key: 'draft', label: 'Draft' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'workflow', label: 'Under Review' },
        { key: 'finalized', label: 'Finalized' },
    ] as const;

    const currentStep = hasSubmission
        ? 3
        : hasDraft
          ? 1
          : periodOpen
            ? 0
            : -1;

    const styles: Record<SubmissionStepStatus, { panel: string; icon: string }> =
        {
            completed: {
                panel: 'border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30',
                icon: 'text-emerald-600 dark:text-emerald-400',
            },
            current: {
                panel: 'border-blue-300 bg-blue-50/90 dark:border-blue-800 dark:bg-blue-950/30',
                icon: 'text-blue-600 dark:text-blue-400 animate-pulse',
            },
            pending: {
                panel: 'border-border bg-muted/20',
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

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {steps.map((step, index) => {
                const status = resolveStatus(index);
                const style = styles[status];
                const Icon = status === 'completed' ? FileCheck2 : Clock3;

                return (
                    <div
                        key={step.key}
                        className={`flex items-center gap-2 rounded-xl border p-3 ${style.panel}`}
                    >
                        <Icon className={`size-4 shrink-0 ${style.icon}`} />
                        <span className="text-xs font-semibold">
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
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
            (row) => row.actual_accomplishment.trim().length > 0,
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
    }, [latestSubmission]);

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
                            <Badge variant="outline">
                                {periodOpen ? 'Period Open' : 'Period Closed'}
                            </Badge>
                            <Badge variant="outline">
                                Status: {submissionStatusLabel}
                            </Badge>
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

                    {latestSubmission?.appeal_status === 'appeal_window_open' &&
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
                                mode="employee"
                                onChange={setFormPayload}
                                currentTarget={currentTarget}
                            />
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
