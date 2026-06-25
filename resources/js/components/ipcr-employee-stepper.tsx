import { CheckCircle2, Circle } from 'lucide-react';
import { Fragment } from 'react';

const STEPS = [
    { key: 'set_targets', label: 'Set Targets' },
    { key: 'submit_targets', label: 'Submit Targets' },
    { key: 'fill_ipcr', label: 'Fill IPCR' },
    { key: 'submitted', label: 'Submitted' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

const STEP_INDEX: Record<StepKey, number> = {
    set_targets: 0,
    submit_targets: 1,
    fill_ipcr: 2,
    submitted: 3,
};

export default function IpcrEmployeeStepper({ currentStep }: { currentStep: StepKey }) {
    const currentIndex = STEP_INDEX[currentStep];

    const renderStep = (step: (typeof STEPS)[number], idx: number) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const panelClass = isCompleted
            ? 'border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30'
            : isCurrent
              ? 'border-blue-300 bg-blue-50/90 dark:border-blue-800 dark:bg-blue-950/30'
              : 'border-border bg-muted/20';
        const iconClass = isCompleted
            ? 'text-emerald-600 dark:text-emerald-400'
            : isCurrent
              ? 'text-blue-600 dark:text-blue-400 animate-pulse'
              : 'text-muted-foreground';
        const Icon = isCompleted ? CheckCircle2 : Circle;
        return (
            <div className={`flex items-center gap-2 rounded-xl border p-3 ${panelClass}`}>
                <Icon className={`size-4 shrink-0 ${iconClass}`} />
                <span className="text-xs font-semibold">{step.label}</span>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-2 sm:hidden">
                {STEPS.map((step, idx) => (
                    <div key={step.key}>{renderStep(step, idx)}</div>
                ))}
            </div>
            <div className="hidden sm:flex sm:items-center">
                {STEPS.map((step, idx) => (
                    <Fragment key={step.key}>
                        <div className="shrink-0">{renderStep(step, idx)}</div>
                        {idx < STEPS.length - 1 && (
                            <div className="h-0.5 flex-1 bg-border" />
                        )}
                    </Fragment>
                ))}
            </div>
        </>
    );
}
