import { CheckCircle2, Clock, XCircle } from 'lucide-react';

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

const STEPS = [
    {
        key: 'submitted',
        label: 'Submitted',
        desc: {
            completed: 'Form submitted to workflow',
            current: 'Form submitted to workflow',
            pending: 'Not yet submitted',
            rejected: 'Submission escalated',
        },
    },
    {
        key: 'evaluated',
        label: 'Evaluated',
        desc: {
            completed: 'Reviewed by evaluator',
            current: 'Awaiting evaluator review',
            pending: 'Pending evaluator review',
            rejected: 'Returned by evaluator',
        },
    },
    {
        key: 'hr_review',
        label: 'HR Review',
        desc: {
            completed: 'HR review complete',
            current: 'Under HR review',
            pending: 'Pending HR review',
            rejected: 'Returned by HR',
        },
    },
    {
        key: 'appeal',
        label: 'Appeal',
        desc: {
            completed: 'Appeal period closed',
            current: 'Appeal window is open',
            pending: 'No appeal required yet',
            rejected: 'Appeal escalated',
        },
    },
    {
        key: 'pmt_review',
        label: 'PMT Review',
        desc: {
            completed: 'PMT review complete',
            current: 'Under PMT review',
            pending: 'Pending PMT review',
            rejected: 'Returned by PMT',
        },
    },
    {
        key: 'finalized',
        label: 'Finalized',
        desc: {
            completed: 'Evaluation finalized',
            current: 'Ready for finalization',
            pending: 'Awaiting finalization',
            rejected: 'Escalated to admin',
        },
    },
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

const styles: Record<StepStatus, { panel: string; line: string; title: string; icon: string }> = {
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
    rejected: {
        panel: 'border-red-300 bg-red-50/90 dark:border-red-800 dark:bg-red-950/30',
        line: 'bg-red-300 dark:bg-red-800',
        title: 'text-red-800 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
    },
    pending: {
        panel: 'border-border bg-muted/20',
        line: 'bg-border',
        title: 'text-foreground',
        icon: 'text-muted-foreground',
    },
};

function resolveStatus(
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

    const renderStep = (step: (typeof STEPS)[number], idx: number) => {
        const stepStatus = resolveStatus(idx, currentStep, isCompleted, isEscalated);
        const s = styles[stepStatus];
        const isLast = idx === STEPS.length - 1;
        const Icon =
            stepStatus === 'completed'
                ? CheckCircle2
                : stepStatus === 'rejected'
                  ? XCircle
                  : Clock;

        return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${s.panel}`}>
                        <Icon className={`size-4 ${s.icon} ${stepStatus === 'current' ? 'animate-pulse' : ''}`} />
                    </div>
                    {!isLast && (
                        <div className={`ml-2 hidden h-0.5 flex-1 rounded-full lg:block ${s.line}`} />
                    )}
                </div>
                <div className={`mt-3 h-full rounded-2xl border p-3 ${s.panel}`}>
                    <p className={`text-sm font-semibold ${s.title}`}>{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.desc[stepStatus]}</p>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-3 lg:hidden">
                {STEPS.map((step, idx) => renderStep(step, idx))}
            </div>
            <div className="hidden lg:flex lg:items-start lg:gap-2">
                {STEPS.map((step, idx) => renderStep(step, idx))}
            </div>
        </>
    );
}
