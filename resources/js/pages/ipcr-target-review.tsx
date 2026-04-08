import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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
    if (role === 'hr') {
        return 'HR Personnel';
    }

    if (role === 'pmt') {
        return 'PMT';
    }

    return 'Evaluator';
}

function targetStatusLabel(target: IpcrTarget | null): string {
    if (!target) {
        return 'Not Set';
    }

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

    return (
        <AppHeaderLayout>
            <Head title="IPCR Target Reference" />
            <div className="app-page-shell app-page-stack animate-fade-in">
                <Card className="glass-card mx-auto w-full min-w-0 max-w-7xl overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="gap-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
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
                            <Badge variant="outline">
                                Viewer: {roleLabel(viewerRole)}
                            </Badge>
                            <Badge variant="outline">
                                Period: {targetPeriodLabel}
                            </Badge>
                            <Badge variant="outline">
                                Target Status:{' '}
                                {targetStatusLabel(currentTarget)}
                            </Badge>
                            {submission?.stage ? (
                                <Badge variant="outline">
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
