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
    tone = 'light',
}: Props) {
    const isDarkTone = tone === 'dark';

    const titleClasses = isDarkTone
        ? 'text-slate-200'
        : 'text-slate-700';
    const descriptionClasses = isDarkTone
        ? 'text-slate-300'
        : 'text-slate-600';
    const cardClasses = isDarkTone
        ? 'border-slate-700 bg-slate-950/70 shadow-none'
        : 'border-slate-300 bg-white shadow-sm';
    const roleClasses = isDarkTone
        ? 'text-slate-400'
        : 'text-slate-500';
    const nameClasses = isDarkTone
        ? 'text-slate-50'
        : 'text-slate-950';
    const dividerClasses = isDarkTone
        ? 'border-slate-500'
        : 'border-slate-400';
    const metaClasses = isDarkTone
        ? 'text-slate-300'
        : 'text-slate-600';
    const noteClasses = isDarkTone
        ? 'text-slate-400'
        : 'text-slate-500';

    return (
        <section className={cn('space-y-4 break-inside-avoid-page', className)}>
            <div className="space-y-1">
                <h3 className={cn('text-sm font-semibold tracking-[0.18em] uppercase', titleClasses)}>
                    {title}
                </h3>
                {description ? (
                    <p className={cn('text-sm leading-6', descriptionClasses)}>
                        {description}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {slots.map((slot) => (
                    <div
                        key={slot.role}
                        className={cn(
                            'rounded-2xl border p-4 print:shadow-none',
                            cardClasses,
                        )}
                    >
                        <p className={cn('text-[10px] font-semibold tracking-[0.2em] uppercase', roleClasses)}>
                            {slot.role}
                        </p>
                        <div className={cn('mt-6 border-b pb-2', dividerClasses)}>
                            <p className={cn('text-sm font-semibold', nameClasses)}>
                                {readOnlyValue(slot.name)}
                            </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className={cn('text-xs', metaClasses)}>
                                Signature line
                            </p>
                            <p className={cn('text-xs', metaClasses)}>
                                {readOnlyValue(slot.date)}
                            </p>
                        </div>
                        {slot.note ? (
                            <p className={cn('mt-2 text-xs leading-5', noteClasses)}>
                                {slot.note}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}
