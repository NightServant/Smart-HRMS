import {
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    MessageSquareMore,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import WorkflowSignOff from '@/components/workflow-sign-off';
import {
    cloneIpcrFormPayload,
    getAdjectivalRating,
    recalculateIpcrFormPayload,
} from '@/lib/ipcr';
import { cn } from '@/lib/utils';
import type {
    IpcrFormPayload,
    IpcrFormRow,
    IpcrTarget,
} from '@/types/ipcr';

type Mode = 'employee' | 'evaluator' | 'review';

type Props = {
    value: IpcrFormPayload;
    mode?: Mode;
    onChange?: (next: IpcrFormPayload) => void;
    className?: string;
    presentation?: 'interactive' | 'print';
    currentTarget?: IpcrTarget | null;
};

function readOnlyValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return String(value);
}

export default function IpcrPaperForm({
    value,
    mode = 'review',
    onChange,
    className,
    presentation = 'interactive',
    currentTarget = null,
}: Props) {
    const isPrintPresentation = presentation === 'print';
    const canEditActual = mode === 'employee';
    const canEditRatings = mode === 'evaluator';
    const showRatings = mode !== 'employee';
    const showRemarks = mode !== 'employee';
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        queueMicrotask(() => {
            setCurrentStep(0);
        });
    }, [mode, value?.template_version, value?.metadata?.period]);

    const sections = useMemo(() => value?.sections ?? [], [value?.sections]);
    const currentSection = sections[currentStep] ?? sections[0];
    const renderedSections = isPrintPresentation
        ? sections
        : currentSection
          ? [currentSection]
          : [];

    const filledActualRows = useMemo(
        () =>
            sections.reduce(
                (count, section) =>
                    count +
                    (section.rows ?? []).filter(
                        (row) =>
                            (row.actual_accomplishment ?? '').trim().length > 0,
                    ).length,
                0,
            ),
        [sections],
    );
    const totalRows = useMemo(
        () =>
            sections.reduce(
                (count, section) => count + (section.rows?.length ?? 0),
                0,
            ),
        [sections],
    );
    const targetReferenceByRowId = useMemo(() => {
        const references = new Map<string, string>();

        (currentTarget?.form_payload?.sections ?? []).forEach((section) => {
            (section.rows ?? []).forEach((row) => {
                const referenceText = (row.accountable ?? '').trim();

                if (referenceText.length > 0) {
                    references.set(row.id, referenceText);
                }
            });
        });

        return references;
    }, [currentTarget]);
    const targetReferenceLabel =
        currentTarget?.status === 'submitted'
            ? 'Submitted target reference'
            : 'Saved target draft';
    const ratingMonitor = useMemo(() => {
        const liveRating =
            value?.finalization?.final_rating ??
            value?.summary?.computed_rating ??
            null;
        const liveAdjectival =
            value?.finalization?.adjectival_rating ??
            value?.summary?.adjectival_rating ??
            getAdjectivalRating(liveRating);
        const isLocked = Boolean(value?.finalization?.finalized_at);

        return {
            rating: liveRating,
            adjectival: liveAdjectival,
            status: isLocked ? 'Finalized Rating' : 'Live Rating Preview',
            helper: isLocked
                ? 'This rating has already been finalized and locked in the workflow.'
                : canEditRatings
                  ? 'Updates instantly as Q, E, and T scores are entered.'
                  : mode === 'employee'
                    ? 'This preview updates as the evaluation moves through the workflow.'
                    : 'This preview reflects the latest saved IPCR computation.',
            tone: isLocked ? 'emerald' : liveRating !== null ? 'sky' : 'amber',
        };
    }, [
        canEditRatings,
        mode,
        value?.finalization?.adjectival_rating,
        value?.finalization?.final_rating,
        value?.finalization?.finalized_at,
        value?.summary?.adjectival_rating,
        value?.summary?.computed_rating,
    ]);

    function updatePayload(updater: (draft: IpcrFormPayload) => void): void {
        if (!onChange) {
            return;
        }

        const next = cloneIpcrFormPayload(value);
        updater(next);
        onChange(recalculateIpcrFormPayload(next));
    }

    function updateRow(
        rowId: string,
        updater: (row: IpcrFormRow) => IpcrFormRow,
    ): void {
        updatePayload((next) => {
            next.sections = next.sections.map((section) => ({
                ...section,
                rows: section.rows.map((row) =>
                    row.id === rowId ? updater(row) : row,
                ),
            }));
        });
    }

    function updateRating(
        rowId: string,
        key: keyof IpcrFormRow['ratings'],
        inputValue: string,
    ): void {
        const parsed = inputValue === '' ? null : Number(inputValue);

        updateRow(rowId, (row) => ({
            ...row,
            ratings: {
                ...row.ratings,
                [key]:
                    parsed !== null &&
                    Number.isInteger(parsed) &&
                    parsed >= 1 &&
                    parsed <= 5
                        ? parsed
                        : null,
            },
        }));
    }

    function updateEmployeeNotes(nextValue: string): void {
        updatePayload((next) => {
            next.workflow_notes.employee_notes = nextValue;
        });
    }

    const infoTileClasses =
        'rounded-2xl border border-border bg-card px-4 py-3 shadow-sm';
    const sectionPanelClasses =
        'glass-card rounded-[26px] border border-border bg-card p-5 shadow-sm';
    const stripedRowClasses = [
        'bg-[#DDEFD7] dark:bg-[#345A34]/80',
        'bg-[#BFDDB5] dark:bg-[#274827]/80',
    ];
    const ratingMonitorToneClasses = {
        emerald:
            'border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10',
        sky: 'border-sky-300/70 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/10',
        amber: 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10',
    }[ratingMonitor.tone];
    const ratingMonitorDotClasses = {
        emerald: 'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]',
        sky: 'bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.14)]',
        amber: 'bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.14)]',
    }[ratingMonitor.tone];
    const formTableWidthClasses = isPrintPresentation
        ? showRatings || showRemarks
            ? 'min-w-[86rem]'
            : 'min-w-[64rem]'
        : showRatings || showRemarks
          ? 'min-w-[72rem] xl:min-w-[86rem]'
          : 'min-w-[56rem] xl:min-w-[68rem]';
    const actualColumnClasses = isPrintPresentation
        ? showRatings || showRemarks
            ? 'w-[20rem] min-w-[20rem] xl:w-[24rem] xl:min-w-[24rem]'
            : 'w-[20rem] min-w-[20rem] xl:w-[28rem] xl:min-w-[28rem]'
        : showRatings || showRemarks
          ? 'w-[24rem] min-w-[24rem] xl:w-[30rem] xl:min-w-[30rem]'
          : 'w-[24rem] min-w-[24rem] xl:w-[30rem] xl:min-w-[30rem]';
    const remarksColumnClasses =
        'w-[14rem] min-w-[14rem] xl:w-[16rem] xl:min-w-[16rem]';

    return (
        <Card
            className={cn(
                isPrintPresentation
                    ? 'w-full min-w-0 overflow-hidden border border-slate-300 bg-white shadow-none print:border-none'
                    : 'glass-card w-full min-w-0 overflow-hidden border border-border bg-card shadow-sm',
                className,
            )}
        >
            <CardHeader
                className={cn(
                    'gap-5 border-b bg-card px-4 py-5 sm:px-6',
                    isPrintPresentation
                        ? 'border-slate-200 bg-white print:border-slate-300'
                        : 'border-border',
                )}
            >
                <div className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.24em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                            <FileSpreadsheet className="size-3.5" />
                            Performance Evaluation
                        </div>
                        <CardTitle className="text-2xl text-foreground">
                            {readOnlyValue(value?.metadata?.form_title)}
                        </CardTitle>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                            Administrative Office IPCR form split into guided
                            sections to reduce visual overload while keeping the
                            full evaluation context visible.
                        </p>
                    </div>

                    <div className="grid w-full gap-2 sm:grid-cols-2 2xl:w-auto 2xl:grid-cols-3">
                        <div className={infoTileClasses}>
                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                Progress
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {currentStep + 1}/{sections.length}
                            </p>
                        </div>
                        <div className={infoTileClasses}>
                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                Rows Filled
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {filledActualRows}/{totalRows}
                            </p>
                        </div>
                        <div className={infoTileClasses}>
                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                Computed Rating
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {value?.summary?.computed_rating !== null &&
                                value?.summary?.computed_rating !== undefined
                                    ? value.summary.computed_rating.toFixed(2)
                                    : 'Pending'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-4">
                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                            Department
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {readOnlyValue(value?.metadata?.department)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                            Period
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {readOnlyValue(value?.metadata?.period)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                            Employee
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {readOnlyValue(value?.metadata?.employee_name)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                            Position
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {readOnlyValue(value?.metadata?.employee_position)}
                        </p>
                    </div>
                </div>

                {!isPrintPresentation && (
                    <div className="flex flex-wrap gap-2">
                        {sections.map((section, index) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => setCurrentStep(index)}
                                className={cn(
                                    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                                    index === currentStep
                                        ? 'border-[#2F5E2B] bg-[#2F5E2B] text-white shadow-sm dark:border-[#4A7C3C] dark:bg-[#1F3F1D]'
                                        : 'border-border bg-card text-foreground hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80',
                                )}
                            >
                                {index + 1}. {section.title}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                        Rated Rows: {value?.summary?.rated_rows ?? 0}
                    </Badge>
                    <Badge variant="outline">
                        Adjectival:{' '}
                        {value?.summary?.adjectival_rating ??
                            getAdjectivalRating(
                                value?.summary?.computed_rating ?? null,
                            ) ??
                            'Pending'}
                    </Badge>
                    {value?.finalization?.final_rating !== null &&
                        value?.finalization?.final_rating !== undefined && (
                            <Badge variant="outline">
                                Final Rating:{' '}
                                {value.finalization.final_rating.toFixed(2)}
                            </Badge>
                        )}
                </div>
            </CardHeader>

            <CardContent className="space-y-6 px-3 py-4 sm:px-6 sm:py-5">
                {renderedSections.map((section, sectionIndex) => (
                    <div key={section.id} className="space-y-4">
                        <div
                            className={cn(
                                sectionPanelClasses,
                                'flex min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between',
                            )}
                        >
                            <div>
                                <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
                                    Section{' '}
                                    {isPrintPresentation
                                        ? sectionIndex + 1
                                        : currentStep + 1}{' '}
                                    of {sections.length}
                                </p>
                                <h3 className="mt-1 text-xl font-semibold text-foreground">
                                    {section.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {isPrintPresentation
                                        ? 'Full printable view of this section for PDF export and signature-ready review.'
                                        : 'Complete the entries in this section before moving to the next step.'}
                                </p>
                            </div>
                            {!isPrintPresentation && (
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:self-start xl:self-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentStep((step) =>
                                                Math.max(0, step - 1),
                                            )
                                        }
                                        disabled={currentStep === 0}
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setCurrentStep((step) =>
                                                Math.min(
                                                    sections.length - 1,
                                                    step + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            currentStep === sections.length - 1
                                        }
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div
                            className={cn(
                                'glass-card rounded-[26px] border bg-card shadow-sm',
                                isPrintPresentation
                                    ? 'overflow-visible border-slate-300 bg-white shadow-none'
                                    : 'overflow-hidden border-border',
                            )}
                        >
                            <Table className={formTableWidthClasses}>
                                <TableHeader>
                                    <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:border-r [&_th]:border-white/10 [&_th]:text-white">
                                        <TableHead className="w-[14rem] min-w-[14rem] xl:w-[16rem] xl:min-w-[16rem]">
                                            Administrative Services Criteria
                                        </TableHead>
                                        <TableHead className="w-[11rem] min-w-[11rem] xl:w-[13rem] xl:min-w-[13rem]">
                                            Success Measures
                                        </TableHead>
                                        <TableHead
                                            className={actualColumnClasses}
                                        >
                                            Actual Accomplishment
                                        </TableHead>
                                        {showRatings && (
                                            <>
                                                <TableHead className="w-[4.5rem] min-w-[4.5rem] text-center">
                                                    Q
                                                </TableHead>
                                                <TableHead className="w-[4.5rem] min-w-[4.5rem] text-center">
                                                    E
                                                </TableHead>
                                                <TableHead className="w-[4.5rem] min-w-[4.5rem] text-center">
                                                    T
                                                </TableHead>
                                                <TableHead className="w-[6.5rem] min-w-[6.5rem] text-center">
                                                    Average
                                                </TableHead>
                                            </>
                                        )}
                                        {showRemarks && (
                                            <TableHead
                                                className={remarksColumnClasses}
                                            >
                                                Remarks
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(section.rows ?? []).map((row, rowIndex) => (
                                        <Fragment key={row.id}>
                                            <TableRow
                                                className={
                                                    stripedRowClasses[
                                                        rowIndex % 2
                                                    ]
                                                }
                                            >
                                                <TableCell className="align-top">
                                                    <div className="space-y-2">
                                                        <p className="leading-snug font-semibold text-foreground">
                                                            {row.target}
                                                        </p>
                                                        {row.target_details && (
                                                            <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                                                                {
                                                                    row.target_details
                                                                }
                                                            </p>
                                                        )}
                                                        {canEditActual &&
                                                            targetReferenceByRowId.has(
                                                                row.id,
                                                            ) && (
                                                                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-emerald-800 uppercase dark:text-emerald-300">
                                                                        {
                                                                            targetReferenceLabel
                                                                        }
                                                                    </p>
                                                                    <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-emerald-950 dark:text-emerald-50">
                                                                        {targetReferenceByRowId.get(
                                                                            row.id,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                                        {row.measures}
                                                    </p>
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        actualColumnClasses,
                                                        'align-top',
                                                    )}
                                                >
                                                    {canEditActual ? (
                                                        <Textarea
                                                            value={
                                                                row.actual_accomplishment
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateRow(
                                                                    row.id,
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        actual_accomplishment:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            placeholder="Describe the actual accomplishment for this criterion."
                                                            className="[field-sizing:fixed] min-h-[11rem] w-full min-w-0 resize-y border-border bg-background text-sm leading-6 md:text-base md:leading-7"
                                                        />
                                                    ) : (
                                                        <div className="min-h-[11rem] w-full min-w-0 rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-foreground shadow-sm md:text-base md:leading-7">
                                                            {readOnlyValue(
                                                                row.actual_accomplishment,
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {showRatings && (
                                                    <>
                                                        {(
                                                            [
                                                                'quality',
                                                                'efficiency',
                                                                'timeliness',
                                                            ] as const
                                                        ).map((key) => (
                                                            <TableCell
                                                                key={`${row.id}-${key}`}
                                                                className="align-top"
                                                            >
                                                                {canEditRatings ? (
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        max="5"
                                                                        step="1"
                                                                        value={
                                                                            row
                                                                                .ratings[
                                                                                key
                                                                            ] ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateRating(
                                                                                row.id,
                                                                                key,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        inputMode="numeric"
                                                                        className="mx-auto h-10 w-16 min-w-0 border-border bg-background px-2 text-center text-sm"
                                                                    />
                                                                ) : (
                                                                    <div className="rounded-2xl border border-border bg-card px-2 py-2 text-center text-sm font-semibold text-foreground shadow-sm">
                                                                        {readOnlyValue(
                                                                            row
                                                                                .ratings[
                                                                                key
                                                                            ],
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="align-top">
                                                            <div className="rounded-2xl border border-border bg-card px-2 py-2 text-center text-sm font-semibold text-foreground shadow-sm">
                                                                {row.average !==
                                                                null
                                                                    ? row.average.toFixed(
                                                                          2,
                                                                      )
                                                                    : '—'}
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                )}
                                                {showRemarks && (
                                                    <TableCell
                                                        className={cn(
                                                            remarksColumnClasses,
                                                            'align-top',
                                                        )}
                                                    >
                                                        {canEditRatings ? (
                                                            <Textarea
                                                                value={
                                                                    row.remarks
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateRow(
                                                                        row.id,
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,
                                                                            remarks:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    )
                                                                }
                                                                placeholder="Add evaluator remarks for this criterion if needed."
                                                                className="min-h-24 w-full min-w-0 resize-y border-border bg-background text-sm leading-6"
                                                            />
                                                        ) : (
                                                            <div className="min-h-24 w-full min-w-0 rounded-2xl border border-border bg-card px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-foreground shadow-sm">
                                                                {readOnlyValue(
                                                                    row.remarks,
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ))}

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="grid gap-4">
                        <div className={sectionPanelClasses}>
                            <div className="mb-3 flex items-center gap-2">
                                <MessageSquareMore className="size-4 text-[#2F5E2B] dark:text-[#9AC68E]" />
                                <h4 className="text-sm font-semibold text-foreground">
                                    Employee Remarks
                                </h4>
                            </div>
                            {mode === 'employee' ? (
                                <Textarea
                                    value={
                                        value?.workflow_notes?.employee_notes ?? ''
                                    }
                                    onChange={(event) =>
                                        updateEmployeeNotes(event.target.value)
                                    }
                                    placeholder="Add context, clarifications, or supporting notes for your submission."
                                    className="min-h-28 resize-y border-border bg-background"
                                />
                            ) : (
                                <p className="min-h-28 rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
                                    {readOnlyValue(
                                        value?.workflow_notes?.employee_notes,
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {mode !== 'employee' && (
                            <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                <Label className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                    HR Remarks
                                </Label>
                                <p className="mt-2 min-h-24 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                    {readOnlyValue(
                                        value?.workflow_notes?.hr_remarks,
                                    )}
                                </p>
                            </div>
                        )}
                        <WorkflowSignOff
                            title="Workflow Sign-Off"
                            description="Names of the evaluator, HR personnel, and PMT reviewer captured for the final IPCR record."
                            slots={[
                                {
                                    role: 'Evaluator',
                                    name: value?.sign_off?.reviewed_by_name ?? null,
                                    date: value?.sign_off?.reviewed_by_date ?? null,
                                },
                                {
                                    role: 'HR Personnel',
                                    name: value?.sign_off?.final_rater_name ?? null,
                                    date: value?.sign_off?.finalized_date ?? null,
                                },
                                {
                                    role: 'PMT',
                                    name: value?.sign_off?.pmt_chair_name ?? null,
                                    date: value?.sign_off?.pmt_date ?? null,
                                },
                            ]}
                        />
                        <div
                            className={cn(
                                'rounded-[26px] border p-4 shadow-sm transition',
                                ratingMonitorToneClasses,
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <Label>Final Rating</Label>
                                    <p className="mt-1 text-[28px] leading-none font-semibold tracking-tight text-foreground">
                                        {ratingMonitor.rating !== null
                                            ? ratingMonitor.rating.toFixed(2)
                                            : 'Pending'}
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-foreground uppercase shadow-sm dark:border-white/10 dark:bg-white/5">
                                    <span
                                        className={cn(
                                            'size-2.5 rounded-full',
                                            !value?.finalization?.finalized_at &&
                                                ratingMonitor.rating !== null
                                                ? 'animate-pulse'
                                                : '',
                                            ratingMonitorDotClasses,
                                        )}
                                    />
                                    {ratingMonitor.status}
                                </div>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-[#2F5E2B] dark:text-[#BDE9AE]">
                                {ratingMonitor.adjectival ?? 'Pending'}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {ratingMonitor.helper}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
