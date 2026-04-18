import { cn } from '@/lib/utils';

export type WorkflowSignOffSlot = {
    role: string;
    name?: string | null;
    date?: string | null;
    note?: string | null;
};

type Props = {
    title: string;
    description?: string;
    slots: WorkflowSignOffSlot[];
    className?: string;
    /** @deprecated No longer needed — dark mode is handled automatically via Tailwind dark: utilities. */
    tone?: 'light' | 'dark';
};

function readOnlyValue(value: string | null | undefined): string {
    if (value === null || value === undefined || value.trim().length === 0) {
        return '—';
    }

    return value;
}

export default function WorkflowSignOff({
    title,
    description,
    slots,
    className,
}: Props) {
    return (
        <section className={cn('space-y-4 break-inside-avoid-page', className)}>
            <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-700 dark:text-slate-200">
                    {title}
                </h3>
                {description ? (
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {description}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {slots.map((slot) => (
                    <div
                        key={slot.role}
                        className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm print:shadow-none dark:border-slate-700 dark:bg-slate-900/50 dark:shadow-none"
                    >
                        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
                            {slot.role}
                        </p>
                        <div className="mt-6 border-b border-slate-400 pb-2 dark:border-slate-600">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                {readOnlyValue(slot.name)}
                            </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                {readOnlyValue(slot.date)}
                            </p>
                        </div>
                        {slot.note ? (
                            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {slot.note}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}
