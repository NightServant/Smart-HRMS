import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    CheckCircle2,
    FileSpreadsheet,
    History,
    Loader2,
    Printer,
    Save,
    Target,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import IpcrTargetFormEditor from '@/components/ipcr-target-form-editor';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
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
    selectedTarget: IpcrTarget | null;
    targetHistory: IpcrTarget[];
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

function semesterShortLabel(semester: 1 | 2, year: number): string {
    return semester === 1
        ? `${year} 1st Semester`
        : `${year} 2nd Semester`;
}

function TargetStatusBadge({
    target,
    isReturned,
}: {
    target: IpcrTarget | null;
    isReturned: boolean;
}) {
    if (!target) {
        return <Badge variant="outline">Not Set</Badge>;
    }

    if (isReturned) {
        return (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                Returned
            </Badge>
        );
    }

    if (target.status === 'submitted') {
        return (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Submitted
            </Badge>
        );
    }

    return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Draft
        </Badge>
    );
}

function HistoryStatusDot({ target }: { target: IpcrTarget }) {
    const tone = target.evaluator_decision === 'rejected'
        ? 'bg-red-500 ring-red-500/30'
        : target.hr_finalized
          ? 'bg-emerald-500 ring-emerald-500/30'
          : target.status === 'submitted'
            ? 'bg-[#2F5E2B] ring-[#2F5E2B]/30'
            : 'bg-amber-500 ring-amber-500/30';

    return (
        <span
            className={`mt-1.5 inline-block size-3 shrink-0 rounded-full ring-4 ${tone}`}
        />
    );
}

function HistoryStatusBadge({ target }: { target: IpcrTarget }) {
    if (target.evaluator_decision === 'rejected') {
        return (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                Returned
            </Badge>
        );
    }
    if (target.hr_finalized) {
        return (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Finalized
            </Badge>
        );
    }
    if (target.status === 'submitted') {
        return (
            <Badge className="bg-[#DDEFD7] text-[#1F3F1D] dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                Submitted
            </Badge>
        );
    }
    return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Draft
        </Badge>
    );
}

function TargetHistoryCard({
    target,
    onView,
}: {
    target: IpcrTarget;
    onView: (target: IpcrTarget) => void;
}) {
    const submittedAt = target.submitted_at
        ? new Date(target.submitted_at).toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    const sectionsCount = target.form_payload?.sections.length ?? 0;
    const totalRows = target.form_payload?.sections.reduce(
        (acc, s) => acc + s.rows.length,
        0,
    ) ?? 0;
    const filledRows = target.form_payload?.sections.reduce(
        (acc, s) =>
            acc + s.rows.filter((r) => r.accountable.trim().length > 0).length,
        0,
    ) ?? 0;

    const canPrint = target.status === 'submitted' && target.form_payload;

    return (
        <div className="relative pl-6">
            <span className="absolute top-0 bottom-0 left-[7px] w-px bg-border" />
            <div className="absolute top-5 left-0">
                <HistoryStatusDot target={target} />
            </div>

            <Card className="glass-card border-border bg-card shadow-sm">
                <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#2F5E2B] uppercase dark:text-[#A8D49E]">
                                {semesterShortLabel(
                                    target.semester,
                                    target.target_year,
                                )}
                            </p>
                            <h3 className="text-lg leading-snug font-semibold text-foreground">
                                {semesterLabel(
                                    target.semester,
                                    target.target_year,
                                )}
                            </h3>
                        </div>
                        <HistoryStatusBadge target={target} />
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarRange className="size-4 text-[#2F5E2B] dark:text-[#A8D49E]" />
                            <span className="font-medium text-foreground">
                                Submitted:
                            </span>
                            <span>{submittedAt ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle2 className="size-4 text-[#2F5E2B] dark:text-[#A8D49E]" />
                            <span className="font-medium text-foreground">
                                Targets Filled:
                            </span>
                            <span>
                                {filledRows}/{totalRows} ({sectionsCount}{' '}
                                section{sectionsCount === 1 ? '' : 's'})
                            </span>
                        </div>
                    </div>

                    {target.evaluator_remarks && (
                        <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-sm leading-6 whitespace-pre-wrap text-foreground">
                            <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                Evaluator Remarks
                            </p>
                            {target.evaluator_remarks}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onView(target)}
                        >
                            View Snapshot
                        </Button>
                        {canPrint ? (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-[#2F5E2B]/40 text-[#2F5E2B] hover:bg-[#DDEFD7] hover:text-[#1F3F1D] dark:border-[#4A7C3C]/40 dark:text-[#A8D49E] dark:hover:bg-[#274827]/80"
                            >
                                <a
                                    href={
                                        ipcrTargetForm.print({
                                            target: target.id,
                                        }).url
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Printer className="size-4" />
                                    Print PDF
                                </a>
                            </Button>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function IpcrTargetPage() {
    const {
        employee,
        targetPeriod,
        existingTarget,
        selectedTarget,
        targetHistory,
        draftFormPayload,
    } = usePage<PageProps>().props;

    const isReturned = existingTarget?.evaluator_decision === 'rejected';
    const isSubmitted =
        existingTarget?.status === 'submitted' && !isReturned;
    const hasDraft = existingTarget?.status === 'draft';
    const deadlinePassed =
        targetPeriod.deadlineAt !== null &&
        new Date() > new Date(targetPeriod.deadlineAt);
    const canEditTargetForm =
        !deadlinePassed &&
        (hasDraft || isReturned || targetPeriod.submissionOpen);

    const initialPayload =
        existingTarget?.form_payload ?? draftFormPayload ?? null;
    const [formPayload, setFormPayload] = useState<IpcrFormPayload | null>(
        initialPayload,
    );
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [activeTab, setActiveTab] = useState<'workspace' | 'history'>(
        selectedTarget ? 'history' : 'workspace',
    );
    const [snapshotTarget, setSnapshotTarget] = useState<IpcrTarget | null>(
        selectedTarget,
    );

    useEffect(() => {
        if (selectedTarget) {
            setSnapshotTarget(selectedTarget);
            setActiveTab('history');
        }
    }, [selectedTarget]);

    useEffect(() => {
        startTransition(() => {
            setFormPayload(
                existingTarget?.form_payload ?? draftFormPayload ?? null,
            );
        });
    }, [existingTarget, draftFormPayload]);

    const allRowsFilled = useMemo(
        () =>
            (formPayload?.sections ?? []).every((section) =>
                section.rows.every(
                    (row) => row.accountable.trim().length > 0,
                ),
            ),
        [formPayload],
    );

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

    const targetWindowStatusLabel = targetPeriod.submissionOpen
        ? 'Target Window Open'
        : 'Target Window Closed';

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
                                    Employee IPCR Targets
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-sm leading-6">
                                    Manage the active IPCR target cycle in the
                                    workspace, or browse past target snapshots
                                    in the history tab.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
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
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <span className="font-medium">
                                        Status:
                                    </span>
                                    <TargetStatusBadge
                                        target={existingTarget}
                                        isReturned={isReturned}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {targetPeriod.deadlineAt && !isSubmitted && (
                            <div
                                className={`glass-card rounded-[26px] border p-5 shadow-sm ${
                                    deadlinePassed
                                        ? 'border-red-300/70 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10'
                                        : 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10'
                                }`}
                            >
                                <div className="mb-1 flex items-center gap-2">
                                    <span
                                        className={`size-2.5 rounded-full shadow-[0_0_0_6px_rgba(0,0,0,0.08)] ${
                                            deadlinePassed
                                                ? 'bg-red-500'
                                                : 'bg-amber-500'
                                        }`}
                                    />
                                    <h3
                                        className={`text-sm font-semibold tracking-[0.18em] uppercase ${
                                            deadlinePassed
                                                ? 'text-red-900 dark:text-red-100'
                                                : 'text-amber-900 dark:text-amber-100'
                                        }`}
                                    >
                                        {deadlinePassed
                                            ? 'Target Window Closed — 15-Day Deadline Passed'
                                            : 'Target Submission Deadline'}
                                    </h3>
                                </div>
                                <p className="text-sm leading-6 text-foreground">
                                    {deadlinePassed
                                        ? `The 15-day submission window expired on ${new Date(
                                              targetPeriod.deadlineAt,
                                          ).toLocaleDateString('en-US', {
                                              month: 'long',
                                              day: 'numeric',
                                              year: 'numeric',
                                          })}.`
                                        : `Submit your targets before ${new Date(
                                              targetPeriod.deadlineAt,
                                          ).toLocaleDateString('en-US', {
                                              month: 'long',
                                              day: 'numeric',
                                              year: 'numeric',
                                          })} (${Math.ceil(
                                              (new Date(
                                                  targetPeriod.deadlineAt,
                                              ).getTime() -
                                                  Date.now()) /
                                                  86400000,
                                          )} day(s) remaining).`}
                                </p>
                            </div>
                        )}
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
                    </CardContent>
                </Card>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                        setActiveTab(v as 'workspace' | 'history')
                    }
                >
                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="workspace" className="gap-2">
                            <Target className="size-4" />
                            Target Workspace
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="size-4" />
                            Past IPCR Targets
                            {targetHistory.length > 0 ? (
                                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2F5E2B] px-1.5 text-[10px] font-semibold text-white dark:bg-[#1F3F1D]">
                                    {targetHistory.length}
                                </span>
                            ) : null}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="workspace" className="mt-4 space-y-4">
                        {!employee ? (
                            <Card className="glass-card border-border bg-card shadow-sm">
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    No employee record found.
                                </CardContent>
                            </Card>
                        ) : isSubmitted && existingTarget ? (
                            <Card className="glass-card border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl">
                                        Current Cycle Target Snapshot
                                    </CardTitle>
                                    <CardDescription>
                                        Your submitted targets for{' '}
                                        {semesterLabel(
                                            existingTarget.semester,
                                            existingTarget.target_year,
                                        )}
                                        . These are locked and cannot be
                                        edited.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <IpcrTargetReadonly
                                        target={existingTarget}
                                    />
                                </CardContent>
                            </Card>
                        ) : !formPayload ? (
                            <Card className="glass-card border-border bg-card shadow-sm">
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    The target form template is unavailable.
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="glass-card border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl">
                                        {isReturned
                                            ? 'Returned Target Workspace'
                                            : hasDraft
                                              ? 'Saved Draft Target'
                                              : 'Current Target Workspace'}
                                    </CardTitle>
                                    <CardDescription>
                                        {isReturned
                                            ? 'Your supervisor returned this target for revision. Update the fields below and submit again when ready.'
                                            : hasDraft &&
                                                !targetPeriod.submissionOpen
                                              ? 'Your saved draft remains accessible for review and updates, even though submission is paused until HR reopens the target window.'
                                              : targetPeriod.submissionOpen
                                                ? 'Complete your target statements in the same guided section layout used by the IPCR submission workflow.'
                                                : 'This is a disabled preview of the target form. HR must open the target window before you can save or submit changes.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <IpcrTargetFormEditor
                                        formPayload={formPayload}
                                        onChange={setFormPayload}
                                        disabled={!canEditTargetForm}
                                    />

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
                                            onClick={() =>
                                                handleSave('submit')
                                            }
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
                                    {!allRowsFilled &&
                                    (targetPeriod.submissionOpen ||
                                        isReturned) ? (
                                        <p className="text-right text-xs text-amber-600 dark:text-amber-400">
                                            All rows must be filled before
                                            submitting.
                                        </p>
                                    ) : null}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-4 space-y-4">
                        <Card className="glass-card border-border bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl">
                                    IPCR Target History
                                </CardTitle>
                                <CardDescription>
                                    A timeline of your previously submitted
                                    target cycles. Open a snapshot or print a
                                    PDF copy of any submitted target.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {targetHistory.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border bg-background/40 px-5 py-10 text-center text-sm text-muted-foreground">
                                        No past IPCR targets yet. Submitted
                                        targets from previous cycles will
                                        appear here.
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {targetHistory.map((target) => (
                                            <TargetHistoryCard
                                                key={target.id}
                                                target={target}
                                                onView={setSnapshotTarget}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog
                    open={snapshotTarget !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSnapshotTarget(null);
                        }
                    }}
                >
                    <DialogContent className="max-h-[92vh] w-[96vw] overflow-y-auto p-4 sm:p-6 md:!max-w-[1400px] lg:!max-w-[1600px]">
                        <DialogHeader>
                            <DialogTitle>
                                {snapshotTarget
                                    ? semesterLabel(
                                          snapshotTarget.semester,
                                          snapshotTarget.target_year,
                                      )
                                    : 'Target Snapshot'}
                            </DialogTitle>
                            <DialogDescription>
                                Past target snapshot rendered in the same
                                layout used by the target review flow.
                            </DialogDescription>
                        </DialogHeader>
                        {snapshotTarget ? (
                            <IpcrTargetReadonly target={snapshotTarget} />
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
