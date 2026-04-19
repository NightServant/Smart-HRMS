import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, XCircle } from 'lucide-react';
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
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import type {
    IpcrEmployee,
    IpcrSubmission,
    IpcrTarget,
} from '@/types';

type PageProps = {
    viewerRole: 'evaluator' | 'hr' | 'pmt';
    employee: IpcrEmployee | null;
    submission: IpcrSubmission | null;
    currentTarget: IpcrTarget | null;
    targetPeriodLabel: string;
    backUrl: string;
    backLabel: string;
};

function roleLabel(role: PageProps['viewerRole']): string {
    if (role === 'hr') return 'HR Personnel';
    if (role === 'pmt') return 'PMT';
    return 'Evaluator';
}

function RoleBadge({ role }: { role: PageProps['viewerRole'] }) {
    if (role === 'hr') {
        return (
            <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                Viewer: HR Personnel
            </Badge>
        );
    }
    if (role === 'pmt') {
        return (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                Viewer: PMT
            </Badge>
        );
    }
    return (
        <Badge className="bg-[#DDEFD7] text-[#2F5E2B] dark:bg-[#274827]/80 dark:text-[#9AC68E]">
            Viewer: Evaluator
        </Badge>
    );
}

function stageBadgeClass(stage: string | undefined): string {
    if (!stage) return '';
    if (['finalized', 'approved_by_pmt'].includes(stage)) {
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    }
    if (['sent_to_evaluator', 'sent_to_hr', 'sent_to_pmt'].includes(stage)) {
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    }
    if (['returned_by_hr', 'returned_by_pmt'].includes(stage)) {
        return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300';
    }
    return '';
}

function targetStatusLabel(target: IpcrTarget | null): string {
    if (!target) return 'Not Set';
    return target.status === 'submitted' ? 'Submitted' : 'Draft';
}

export default function ReviewerIpcrTargetPage() {
    const {
        viewerRole,
        employee,
        submission,
        currentTarget,
        targetPeriodLabel,
        backUrl,
        backLabel,
    } = usePage<PageProps>().props;

    const stageClass = stageBadgeClass(submission?.stage ?? undefined);

    return (
        <AppHeaderLayout>
            <Head title="IPCR Target Reference" />
            <div className="app-page-shell app-page-stack animate-fade-in">
                <Card className="glass-card mx-auto w-full min-w-0 max-w-7xl overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="gap-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                    <FileSpreadsheet className="size-3.5" />
                                    Performance Evaluation
                                </div>
                                <CardTitle className="text-2xl">
                                    {employee
                                        ? `${employee.name} Target Reference`
                                        : 'IPCR Target Reference'}
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-sm leading-6">
                                    Review the employee target on its own page,
                                    separate from the IPCR submission and
                                    evaluation workspace.
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline">
                                <Link href={backUrl}>
                                    <ArrowLeft className="size-4" />
                                    {backLabel}
                                </Link>
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <RoleBadge role={viewerRole} />
                            <Badge variant="outline">
                                Period: {targetPeriodLabel}
                            </Badge>
                            <Badge variant="outline">
                                Target Status:{' '}
                                {targetStatusLabel(currentTarget)}
                            </Badge>
                            {submission?.stage ? (
                                <Badge className={stageClass || undefined} variant={stageClass ? undefined : 'outline'}>
                                    Submission Stage:{' '}
                                    {submission.stage.replaceAll('_', ' ')}
                                </Badge>
                            ) : null}
                        </div>
                    </CardHeader>
                </Card>

                <Card className="glass-card mx-auto w-full min-w-0 max-w-7xl overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle>Target Snapshot</CardTitle>
                        <CardDescription>
                            This target record stays separate from the
                            submission review screen while keeping the same
                            overall IPCR page pattern.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Employee
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {employee?.name ?? 'Unavailable'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Target Status
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {targetStatusLabel(currentTarget)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 sm:col-span-2 xl:col-span-1">
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Submission Context
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    {submission
                                        ? 'Opened from reviewer routing'
                                        : 'Standalone target reference'}
                                </p>
                            </div>
                        </div>

                        {currentTarget?.evaluator_decision ? (
                            <div className={`glass-card rounded-[26px] border p-5 shadow-sm ${
                                currentTarget.evaluator_decision === 'approved'
                                    ? 'border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                                    : 'border-red-300/70 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10'
                            }`}>
                                <div className="mb-2 flex items-center gap-2">
                                    {currentTarget.evaluator_decision === 'approved' ? (
                                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <XCircle className="size-4 text-red-600 dark:text-red-400" />
                                    )}
                                    <h3 className={`text-sm font-semibold tracking-[0.18em] uppercase ${
                                        currentTarget.evaluator_decision === 'approved'
                                            ? 'text-emerald-900 dark:text-emerald-100'
                                            : 'text-red-900 dark:text-red-100'
                                    }`}>
                                        {currentTarget.evaluator_decision === 'approved'
                                            ? 'Targets Approved'
                                            : 'Targets Returned for Revision'}
                                    </h3>
                                </div>
                                {currentTarget.evaluator_remarks ? (
                                    <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                                        {currentTarget.evaluator_remarks}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {currentTarget ? (
                            <IpcrTargetReadonly
                                target={currentTarget}
                                title="IPCR Target Record"
                                description="This target record is displayed separately so reviewers can compare it against the submission without mixing the two workflows."
                            />
                        ) : (
                            <Card className="glass-card mx-auto w-full min-w-0 overflow-hidden border border-border bg-card shadow-sm">
                                <CardHeader className="border-b border-border">
                                    <CardTitle>No Target Record Found</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 text-sm leading-6 text-muted-foreground">
                                    No IPCR target has been saved for this
                                    employee and period yet.
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppHeaderLayout>
    );
}
