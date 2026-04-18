import { Head, Link, usePage } from '@inertiajs/react';
import { FileSpreadsheet } from 'lucide-react';
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
import AppLayout from '@/layouts/app-layout';
import * as ipcr from '@/routes/ipcr';
import * as ipcrTargetForm from '@/routes/ipcr/target';
import type { BreadcrumbItem } from '@/types';
import type { IpcrTarget, IpcrTargetPeriod } from '@/types/ipcr';

type PageProps = {
    targetPeriod: IpcrTargetPeriod;
    existingTarget: IpcrTarget | null;
    selectedTarget: IpcrTarget | null;
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

function TargetStatusBadge({ target, isReturned }: { target: IpcrTarget | null; isReturned: boolean }) {
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

export default function IpcrTargetPage() {
    const { targetPeriod, existingTarget, selectedTarget } =
        usePage<PageProps>().props;

    const isReturned = existingTarget?.evaluator_decision === 'rejected';
    const isSubmitted =
        existingTarget?.status === 'submitted' && !isReturned;
    const deadlinePassed =
        targetPeriod.deadlineAt !== null &&
        new Date() > new Date(targetPeriod.deadlineAt);
    const canOpenTargetForm =
        !isSubmitted &&
        !deadlinePassed &&
        (targetPeriod.submissionOpen ||
            existingTarget?.status === 'draft' ||
            isReturned);
    const openTargetFormLabel = isReturned
        ? 'Open Returned Targets'
        : existingTarget?.status === 'draft'
          ? 'Resume Target Draft'
          : 'Open IPCR Target Form';

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
                                    Employee IPCR Target History
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-sm leading-6">
                                    Review past target submissions here, then
                                    open the separate IPCR target form when
                                    you need to create or update the active
                                    cycle targets.
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
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <span className="font-medium">Status:</span>
                                    <TargetStatusBadge target={existingTarget} isReturned={isReturned} />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        {targetPeriod.deadlineAt && !isSubmitted && (
                            <div className={`glass-card rounded-[26px] border p-5 shadow-sm ${deadlinePassed ? 'border-red-300/70 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10' : 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10'}`}>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className={`size-2.5 rounded-full shadow-[0_0_0_6px_rgba(0,0,0,0.08)] ${deadlinePassed ? 'bg-red-500' : 'bg-amber-500'}`} />
                                    <h3 className={`text-sm font-semibold tracking-[0.18em] uppercase ${deadlinePassed ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'}`}>
                                        {deadlinePassed ? 'Target Window Closed — 15-Day Deadline Passed' : 'Target Submission Deadline'}
                                    </h3>
                                </div>
                                <p className="text-sm leading-6 text-foreground">
                                    {deadlinePassed
                                        ? `The 15-day submission window expired on ${new Date(targetPeriod.deadlineAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                                        : `Submit your targets before ${new Date(targetPeriod.deadlineAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${Math.ceil((new Date(targetPeriod.deadlineAt).getTime() - Date.now()) / 86400000)} day(s) remaining).`}
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

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            {canOpenTargetForm ? (
                                <Button asChild className="w-full sm:w-auto">
                                    <Link href={ipcrTargetForm.form().url}>
                                        {openTargetFormLabel}
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    disabled
                                    className="w-full sm:w-auto"
                                >
                                    {isSubmitted
                                        ? 'Target Already Submitted'
                                        : deadlinePassed
                                          ? 'Deadline Passed'
                                          : 'Target Window Closed'}
                                </Button>
                            )}
                            <p className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                {isSubmitted
                                    ? 'Your targets for this cycle have already been submitted and are locked. Review the snapshot below.'
                                    : isReturned
                                      ? 'Your supervisor returned these targets for revision. Reopen the form to make your edits.'
                                      : 'The target form is now separate from this history page so you can review snapshots without mixing them with the editor.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {isSubmitted && existingTarget ? (
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
                                . These are locked and cannot be edited.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <IpcrTargetReadonly target={existingTarget} />
                        </CardContent>
                    </Card>
                ) : null}

                {selectedTarget && (
                    <Card className="glass-card border-border bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">
                                Selected Past Target Snapshot
                            </CardTitle>
                            <CardDescription>
                                Reviewing{' '}
                                {semesterLabel(
                                    selectedTarget.semester,
                                    selectedTarget.target_year,
                                )}{' '}
                                in the same snapshot layout used by the target
                                review flow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <IpcrTargetReadonly target={selectedTarget} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
