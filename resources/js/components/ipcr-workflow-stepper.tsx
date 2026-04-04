import { CheckCircle2, Clock, XCircle } from 'lucide-react';

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

const STEPS = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'evaluated', label: 'Evaluated' },
    { key: 'hr_review', label: 'HR Review' },
    { key: 'appeal', label: 'Appeal' },
    { key: 'pmt_review', label: 'PMT Review' },
    { key: 'finalized', label: 'Finalized' },
] as const;

const STAGE_TO_STEP: Record<string, number> = {
    sent_to_evaluator: 1,
    waiting_for_remarks: 1,
    data_saved: 2,
    remarks_saved: 2,
    sent_to_hr: 2,
    appeal_window_open: 3,
    sent_to_pmt: 4,
    sent_to_hr_finalize: 5,
    finalized: 5,
    escalated: 5,
};

function resolveStepStatus(
    stepIndex: number,
    currentStep: number,
    isCompleted: boolean,
    isEscalated: boolean,
): StepStatus {
    if (isEscalated && stepIndex === currentStep) return 'rejected';
    if (isCompleted && stepIndex <= 5) return 'completed';
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
}

const statusStyles: Record<StepStatus, { panel: string; icon: string }> = {
    completed: {
        panel: 'border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
    },
    current: {
        panel: 'border-blue-300 bg-blue-50/90 dark:border-blue-800 dark:bg-blue-950/30',
        icon: 'text-blue-600 dark:text-blue-400 animate-pulse',
    },
    rejected: {
        panel: 'border-red-300 bg-red-50/90 dark:border-red-800 dark:bg-red-950/30',
        icon: 'text-red-600 dark:text-red-400',
    },
    pending: {
        panel: 'border-border bg-muted/20',
        icon: 'text-muted-foreground',
    },
};

export default function IpcrWorkflowStepper({
    stage,
    status,
    isEscalated = false,
}: {
    stage: string | null;
    status: string | null;
    isEscalated?: boolean;
}) {
    const currentStep = STAGE_TO_STEP[stage ?? ''] ?? 0;
    const isCompleted = status === 'completed' && stage === 'finalized';

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((step, idx) => {
                const stepStatus = resolveStepStatus(
                    idx,
                    currentStep,
                    isCompleted,
                    isEscalated,
                );
                const styles = statusStyles[stepStatus];
                const Icon =
                    stepStatus === 'completed'
                        ? CheckCircle2
                        : stepStatus === 'rejected'
                          ? XCircle
                          : Clock;

                return (
                    <div
                        key={step.key}
                        className={`flex items-center gap-2 rounded-xl border p-3 ${styles.panel}`}
                    >
                        <Icon className={`size-4 shrink-0 ${styles.icon}`} />
                        <span className="text-xs font-semibold">
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
