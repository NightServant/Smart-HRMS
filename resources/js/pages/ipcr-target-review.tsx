import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import IpcrTargetReadonly from '@/components/ipcr-target-readonly';
import PageIntro from '@/components/page-intro';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
                <PageIntro
                    eyebrow={`${roleLabel(viewerRole)} · IPCR Target`}
                    title={
                        employee
                            ? `${employee.name} Target Reference`
                            : 'IPCR Target Reference'
                    }
                    description="Review the employee target on its own page, separate from the IPCR submission and evaluation workspace."
                    actions={
                        <Link
                            href={backUrl}
                            className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                        >
                            <ArrowLeft className="size-4" />
                            {backLabel}
                        </Link>
                    }
                />

                <Card className="glass-card mx-auto w-full min-w-0 max-w-7xl overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="gap-4 border-b border-border bg-card">
                        <div className="flex flex-wrap gap-2">
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
                    <CardContent className="pt-6">
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
