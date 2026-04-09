import { Head, Link, router, usePage } from '@inertiajs/react';
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
    targetHistory: IpcrTarget[];
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

function targetStatusLabel(target: IpcrTarget | null): string {
    if (!target) {
        return 'Not Set';
    }

    return target.status === 'submitted' ? 'Submitted' : 'Draft';
}

export default function IpcrTargetPage() {
    const { targetPeriod, existingTarget, selectedTarget, targetHistory } =
        usePage<PageProps>().props;

    const isReturned = existingTarget?.evaluator_decision === 'rejected';
    const isSubmitted =
        existingTarget?.status === 'submitted' && !isReturned;
    const canOpenTargetForm =
        !isSubmitted &&
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
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Period:{' '}
                                    {semesterLabel(
                                        targetPeriod.semester,
                                        targetPeriod.year,
                                    )}
                                </Badge>
                                <Badge variant="outline">
                                    Latest Status:{' '}
                                    {targetStatusLabel(existingTarget)}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
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

                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">
                            Past IPCR Target Forms
                        </CardTitle>
                        <CardDescription>
                            Open any previous target snapshot without leaving
                            the history page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {targetHistory.length === 0 ? (
                            <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-8 text-center text-sm text-muted-foreground">
                                No past IPCR target forms yet.
                            </div>
                        ) : (
                            targetHistory.map((target) => (
                                <div
                                    key={target.id}
                                    className="glass-card rounded-2xl border border-border/70 bg-background/40 p-4 sm:p-5"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                                Period
                                            </p>
                                            <p className="text-sm font-semibold text-foreground sm:text-base">
                                                {semesterLabel(
                                                    target.semester,
                                                    target.target_year,
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {target.status === 'submitted'
                                                    ? 'Submitted'
                                                    : 'Draft'}
                                                {' • '}
                                                {target.submitted_at
                                                    ? new Date(
                                                          target.submitted_at,
                                                      ).toLocaleDateString()
                                                    : 'Not yet submitted'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    router.get(
                                                        ipcr.target().url,
                                                        {
                                                            target_id:
                                                                target.id,
                                                        },
                                                        {
                                                            preserveScroll:
                                                                true,
                                                            preserveState: true,
                                                        },
                                                    )
                                                }
                                            >
                                                Open Snapshot
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

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
