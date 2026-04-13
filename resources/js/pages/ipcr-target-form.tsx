import { Head, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    Loader2,
    Save,
    Target,
} from 'lucide-react';
import { Fragment, startTransition, useEffect, useMemo, useState } from 'react';
import IpcrTargetReadonly from '@/components/ipcr-target-readonly';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cloneIpcrFormPayload } from '@/lib/ipcr';
import { cn } from '@/lib/utils';
import * as ipcr from '@/routes/ipcr';
import * as ipcrTargetForm from '@/routes/ipcr/target';
import type { BreadcrumbItem } from '@/types';
import type {
    IpcrEmployee,
    IpcrFormPayload,
    IpcrTarget,
    IpcrTargetPeriod,
} from '@/types/ipcr';

type PageProps = {
    employee: IpcrEmployee | null;
    targetPeriod: IpcrTargetPeriod;
    existingTarget: IpcrTarget | null;
    draftFormPayload: IpcrFormPayload | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'IPCR Target',
        href: ipcr.target().url,
    },
];

function semesterLabel(semester: 1 | 2, year: number): string {
    return semester === 1
        ? `First Semester (January–June) ${year}`
        : `Second Semester (July–December) ${year}`;
}

function TargetFormEditor({
    formPayload,
    onChange,
    disabled = false,
}: {
    formPayload: IpcrFormPayload;
    onChange: (next: IpcrFormPayload) => void;
    disabled?: boolean;
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const sections = formPayload.sections;
    const currentSection = sections[currentStep] ?? sections[0];
    const stripedRowClasses = [
        'bg-[#DDEFD7] dark:bg-[#345A34]/80',
        'bg-[#BFDDB5] dark:bg-[#274827]/80',
    ];

    const filledRows = useMemo(
        () =>
            formPayload.sections.reduce(
                (count, section) =>
                    count +
                    section.rows.filter(
                        (row) => row.accountable.trim().length > 0,
                    ).length,
                0,
            ),
        [formPayload.sections],
    );
    const totalRows = useMemo(
        () =>
            formPayload.sections.reduce(
                (count, section) => count + section.rows.length,
                0,
            ),
        [formPayload.sections],
    );

    function updateTarget(rowId: string, value: string): void {
        const next = cloneIpcrFormPayload(formPayload);
        next.sections = next.sections.map((section) => ({
            ...section,
            rows: section.rows.map((row) =>
                row.id === rowId ? { ...row, accountable: value } : row,
            ),
        }));
        onChange(next);
    }

    if (!currentSection) {
        return null;
    }

    const sectionFilledRows = currentSection.rows.filter(
        (row) => row.accountable.trim().length > 0,
    ).length;
    const sectionTotalRows = currentSection.rows.length;
    const sectionAllFilled = sectionFilledRows === sectionTotalRows;

    return (
        <div className="space-y-4">
            <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
                <CardHeader className="gap-4 border-b border-border bg-card px-4 py-5 sm:px-6">
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.24em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                IPCR Target Form
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Define your performance targets for each
                                criterion. These will be referenced when you
                                submit your IPCR with actual accomplishments.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-sm">
                            <Badge variant="outline">
                                {filledRows}/{totalRows} filled
                            </Badge>
                            <Badge variant="outline">
                                Section {currentStep + 1}/{sections.length}
                            </Badge>
                        </div>
                    </div>

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
                </CardHeader>

                <CardContent className="space-y-4 px-3 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">
                                {currentSection.title}
                            </h3>
                            <Badge
                                className={sectionAllFilled
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}
                            >
                                {sectionFilledRows}/{sectionTotalRows} filled
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCurrentStep((s) => Math.max(0, s - 1))
                                }
                                disabled={currentStep === 0}
                            >
                                <ChevronLeft className="size-4" />
                                Previous
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCurrentStep((s) =>
                                        Math.min(sections.length - 1, s + 1),
                                    )
                                }
                                disabled={currentStep === sections.length - 1}
                            >
                                Next
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
                        <Table className="min-w-[56rem]">
                            <TableHeader>
                                <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:border-r [&_th]:border-white/10 [&_th]:text-white">
                                    <TableHead className="w-[16rem] min-w-[16rem]">
                                        Administrative Services Criteria
                                    </TableHead>
                                    <TableHead className="w-[13rem] min-w-[13rem]">
                                        Success Measures
                                    </TableHead>
                                    <TableHead>
                                        Target{' '}
                                        <span className="text-xs font-normal opacity-80">
                                            (describe your planned
                                            accomplishment)
                                        </span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentSection.rows.map((row, rowIndex) => (
                                    <Fragment key={row.id}>
                                        <TableRow
                                            className={
                                                stripedRowClasses[rowIndex % 2]
                                            }
                                        >
                                            <TableCell className="align-top">
                                                <div className="space-y-1">
                                                    <p className="leading-snug font-semibold text-foreground">
                                                        {row.target}
                                                    </p>
                                                    {row.target_details && (
                                                        <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                                                            {row.target_details}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                                    {row.measures}
                                                </p>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Textarea
                                                    value={row.accountable}
                                                    disabled={disabled}
                                                    onChange={(e) =>
                                                        updateTarget(
                                                            row.id,
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Describe the specific target or planned output for this criterion."
                                                    className="[field-sizing:fixed] min-h-[9rem] w-full resize-y border-border bg-background text-sm leading-6"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function IpcrTargetFormPage() {
    const { employee, targetPeriod, existingTarget, draftFormPayload } =
        usePage<PageProps>().props;

    const isReturned = existingTarget?.evaluator_decision === 'rejected';
    const [formPayload, setFormPayload] = useState<IpcrFormPayload | null>(
        existingTarget?.form_payload ?? draftFormPayload ?? null,
    );
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    useEffect(() => {
        startTransition(() => {
            setFormPayload(
                existingTarget?.form_payload ?? draftFormPayload ?? null,
            );
        });
    }, [existingTarget, draftFormPayload]);

    const isSubmitted = existingTarget?.status === 'submitted' && !isReturned;
    const hasDraft = existingTarget?.status === 'draft';
    const canEditTargetForm = hasDraft || isReturned || targetPeriod.submissionOpen;
    const targetStatusLabel = isSubmitted
        ? 'Submitted'
        : isReturned
          ? 'Returned'
          : hasDraft
          ? 'Draft'
          : 'Not Started';
    const targetWindowStatusLabel = targetPeriod.submissionOpen
        ? 'Target Window Open'
        : 'Target Window Closed';
    const targetWindowDescription = targetPeriod.submissionOpen
        ? `You can save or submit targets for this cycle during ${targetPeriod.submissionWindowLabel}.`
        : isReturned
          ? 'Your supervisor returned these targets for revision. You can update them and submit them again from this workspace.'
        : hasDraft
          ? `This draft target can still be updated, but new submissions must wait until ${targetPeriod.submissionWindowLabel}.`
          : `This target cycle can only be edited during ${targetPeriod.submissionWindowLabel}.`;
    const activePayload = existingTarget?.form_payload ?? formPayload;
    const totalRows = activePayload?.sections.reduce(
        (count, section) => count + section.rows.length,
        0,
    ) ?? 0;
    const plannedRows = activePayload?.sections.reduce(
        (count, section) =>
            count +
            section.rows.filter((row) => row.accountable.trim().length > 0)
                .length,
        0,
    ) ?? 0;
    const allRowsFilled = (formPayload?.sections ?? []).every((section) =>
        section.rows.every((row) => row.accountable.trim().length > 0),
    );
    const targetSummaryText = isSubmitted
        ? 'Your target has already been submitted for this cycle and will be referenced in the matching IPCR submission.'
        : isReturned
          ? 'Your supervisor returned these targets for revision. Update the workspace below and submit them again when ready.'
        : hasDraft
          ? targetPeriod.submissionOpen
            ? 'Your draft target is ready to continue. Complete the remaining sections and submit it during the active target window.'
            : 'Your draft target remains available for review and updates. You can submit it again once the target window reopens.'
          : targetPeriod.submissionOpen
            ? 'Set your targets for this evaluation cycle before the matching IPCR submission opens.'
            : 'The target form is currently closed. You can preview the workspace below, but editing stays disabled until HR opens the target window.';
    const primaryActionLabel = isSubmitted
        ? 'Open Target Snapshot'
        : isReturned
          ? 'Open Returned Targets'
          : hasDraft && !targetPeriod.submissionOpen
          ? 'Resume Draft'
          : targetPeriod.submissionOpen
            ? 'Open IPCR Target Form'
            : 'Preview Target Form';
    const workspaceTitle = isSubmitted
        ? 'Current Target Record'
        : isReturned
          ? 'Returned Target Workspace'
          : hasDraft && !targetPeriod.submissionOpen
          ? 'Saved Draft Target'
          : targetPeriod.submissionOpen
            ? 'Current Target Workspace'
            : 'Target Form Preview';
    const workspaceDescription = isSubmitted
        ? 'Review the target snapshot for this cycle in the same sectioned layout used throughout the IPCR process.'
        : isReturned
          ? 'Your supervisor returned this target for revision. Update the fields below and submit it again when ready.'
          : hasDraft && !targetPeriod.submissionOpen
          ? 'Your saved draft remains accessible for review and updates, even though submission is paused until HR reopens the target window.'
          : targetPeriod.submissionOpen
            ? 'Complete your target statements in the same guided section layout used by the IPCR submission workflow.'
            : 'This is a disabled preview of the target form. HR must open the target window before you can save or submit changes.';

    function handleSave(action: 'save' | 'submit'): void {
        if (!formPayload || !employee) return;

        if (action === 'submit' && !targetPeriod.submissionOpen && !isReturned) {
            return;
        }

        if (action === 'submit' && !allRowsFilled) {
            return;
        }

        if (action === 'save' && !canEditTargetForm) {
            return;
        }

        const setProcessing =
            action === 'submit' ? setSubmitting : setSavingDraft;
        setProcessing(true);

        router.post(
            ipcrTargetForm.save().url,
            {
                semester: targetPeriod.semester,
                target_year: targetPeriod.year,
                form_payload: formPayload,
                action,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    if (!employee || !formPayload) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="IPCR Target" />
                <div className="app-page-shell flex items-center justify-center py-24">
                    <p className="text-muted-foreground">
                        No employee record found.
                    </p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Target" />
            <div className="app-page-shell app-page-stack pb-10">
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
                                    {targetSummaryText}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Period:{' '}
                                    {semesterLabel(
                                        targetPeriod.semester,
                                        targetPeriod.year,
                                    )}
                                </Badge>
                                <Badge variant="outline">
                                    {targetWindowStatusLabel}
                                </Badge>
                                <Badge variant="outline">
                                    Latest Status: {targetStatusLabel}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <Button asChild className="w-full sm:w-auto">
                                <a href="#target-workspace">{primaryActionLabel}</a>
                            </Button>
                            <p className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                {targetWindowDescription}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {isSubmitted && existingTarget ? (
                    <Card
                        id="target-workspace"
                        className="glass-card border-border bg-card shadow-sm"
                    >
                        <CardHeader>
                            <CardTitle className="text-xl">
                                {workspaceTitle}
                            </CardTitle>
                            <CardDescription>
                                {workspaceDescription}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="glass-card rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Period
                                            </p>
                                            <p className="text-sm font-semibold text-foreground sm:text-base">
                                                {semesterLabel(
                                                    targetPeriod.semester,
                                                    targetPeriod.year,
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full lg:w-auto"
                                            onClick={() => {
                                                const element =
                                                    document.getElementById(
                                                        'target-workspace-table',
                                                    );
                                                element?.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'start',
                                                });
                                            }}
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
                                                {targetStatusLabel}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Workspace Access
                                            </p>
                                            <p className="mt-1 font-medium text-foreground">
                                                {targetWindowStatusLabel}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
                                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Target Rows
                                            </p>
                                            <p className="mt-1 font-medium text-foreground">
                                                {plannedRows}/{totalRows}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="target-workspace-table">
                                <IpcrTargetReadonly target={existingTarget} />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card
                        id="target-workspace"
                        className="glass-card border-border bg-card shadow-sm"
                    >
                        <CardHeader>
                            <CardTitle className="text-xl">
                                {workspaceTitle}
                            </CardTitle>
                            <CardDescription>
                                {workspaceDescription}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isReturned && existingTarget?.evaluator_remarks ? (
                                <div className="glass-card rounded-[26px] border border-red-300/70 bg-red-50/80 p-5 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.14)]" />
                                        <h3 className="text-sm font-semibold tracking-[0.18em] text-red-900 uppercase dark:text-red-100">
                                            Target Returned for Revision
                                        </h3>
                                    </div>
                                    <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                                        {existingTarget.evaluator_remarks}
                                    </p>
                                </div>
                            ) : null}
                            <div className="glass-card rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Period
                                            </p>
                                            <p className="text-sm font-semibold text-foreground sm:text-base">
                                                {semesterLabel(
                                                    targetPeriod.semester,
                                                    targetPeriod.year,
                                                )}
                                            </p>
                                        </div>
                                        {canEditTargetForm ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full lg:w-auto"
                                                onClick={() => {
                                                    const element =
                                                        document.getElementById(
                                                            'target-form-editor',
                                                        );
                                                    element?.scrollIntoView({
                                                        behavior: 'smooth',
                                                        block: 'start',
                                                    });
                                                }}
                                            >
                                                {hasDraft &&
                                                !targetPeriod.submissionOpen
                                                    ? 'Resume Draft'
                                                    : isReturned
                                                      ? 'Open Returned Targets'
                                                    : 'Open Workspace'}
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full lg:w-auto"
                                                disabled
                                            >
                                                Window Closed
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Status
                                            </p>
                                            <p className="mt-1 font-medium text-foreground">
                                                {targetStatusLabel}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Workspace Access
                                            </p>
                                            <p className="mt-1 font-medium text-foreground">
                                                {targetWindowStatusLabel}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
                                            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Target Rows
                                            </p>
                                            <p className="mt-1 font-medium text-foreground">
                                                {plannedRows}/{totalRows}
                                            </p>
                                        </div>
                                    </div>
                                    {!canEditTargetForm && !hasDraft ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                            The target form is closed right now.
                                            You can preview the workspace below,
                                            but saving and submitting stay
                                            disabled until HR opens the target
                                            window.
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div id="target-form-editor">
                                <TargetFormEditor
                                    formPayload={formPayload}
                                    onChange={setFormPayload}
                                    disabled={!canEditTargetForm}
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSave('save')}
                                    disabled={
                                        savingDraft ||
                                        submitting ||
                                        !canEditTargetForm
                                    }
                                >
                                    {savingDraft ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Save className="size-4" />
                                    )}
                                    {savingDraft
                                        ? 'Saving...'
                                        : 'Save as Draft'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleSave('submit')}
                                    disabled={
                                        savingDraft ||
                                        submitting ||
                                        (!targetPeriod.submissionOpen &&
                                            !isReturned) ||
                                        !allRowsFilled
                                    }
                                >
                                    {submitting ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Target className="size-4" />
                                    )}
                                    {submitting
                                        ? 'Submitting...'
                                        : 'Submit Targets'}
                                </Button>
                            </div>
                            {!allRowsFilled && (targetPeriod.submissionOpen || isReturned) ? (
                                <p className="text-right text-xs text-amber-600 dark:text-amber-400">
                                    All rows must be filled before submitting.
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
