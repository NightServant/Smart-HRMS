import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { submitIpcr } from '@/actions/App/Http/Controllers/IwrController';
import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IpcrFormPayload, IpcrSubmission, User } from '@/types';

type PageProps = {
    auth: { user: User & { employee_id?: string } };
    currentPeriod: { label: string; year: number; isOpen: boolean };
    periodOpen: boolean;
    canStartNewSubmission: boolean;
    draftFormPayload: IpcrFormPayload | null;
    latestSubmission: IpcrSubmission | null;
};

function allActualAccomplishmentsFilled(formPayload: IpcrFormPayload | null): boolean {
    if (!formPayload) {
        return false;
    }

    return formPayload.sections.every((section) =>
        section.rows.every((row) => row.actual_accomplishment.trim().length > 0),
    );
}

export default function SubmitCard() {
    const {
        auth,
        currentPeriod,
        periodOpen,
        canStartNewSubmission,
        draftFormPayload,
        latestSubmission,
    } = usePage<PageProps>().props;

    const [formPayload, setFormPayload] = useState<IpcrFormPayload | null>(draftFormPayload);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setFormPayload(draftFormPayload);
    }, [draftFormPayload]);

    const isViewingActiveSubmission = Boolean(latestSubmission && !canStartNewSubmission);
    const canSubmit = periodOpen
        && canStartNewSubmission
        && auth.user.employee_id
        && allActualAccomplishmentsFilled(formPayload)
        && !processing;

    const summaryText = useMemo(() => {
        if (!latestSubmission) {
            return 'Draft a new submission for the current period.';
        }

        if (latestSubmission.stage === 'finalized') {
            return 'Your previous IPCR has been finalized. You can start a new cycle when the period is open.';
        }

        return latestSubmission.notification ?? 'Your IPCR is currently moving through the workflow.';
    }, [latestSubmission]);

    function handleSubmit(): void {
        if (!auth.user.employee_id || !formPayload) {
            return;
        }

        setProcessing(true);

        router.post(
            submitIpcr.url(),
            {
                employee_id: auth.user.employee_id,
                period: currentPeriod.label,
                form_payload: formPayload,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <div className="grid gap-6 animate-fade-in-up">
            <Card className="glass-card border border-border bg-card shadow-sm">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Current Evaluation Cycle</CardTitle>
                            <CardDescription>{summaryText}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Period: {currentPeriod.label}</Badge>
                            <Badge variant="outline">{periodOpen ? 'Period Open' : 'Period Closed'}</Badge>
                            {latestSubmission?.status && <Badge variant="outline">Status: {latestSubmission.status}</Badge>}
                        </div>
                    </div>

                    {latestSubmission && (
                        <IpcrWorkflowStepper
                            stage={latestSubmission.stage}
                            status={latestSubmission.status}
                            isEscalated={latestSubmission.is_escalated}
                        />
                    )}

                    {latestSubmission?.is_escalated && (
                        <EscalationWarning reason={latestSubmission.escalation_reason} />
                    )}

                    {latestSubmission?.appeal_status === 'appeal_window_open' && latestSubmission.appeal_window_closes_at && (
                        <div className="flex flex-wrap items-center gap-3">
                            <AppealCountdown closesAt={latestSubmission.appeal_window_closes_at} />
                            {latestSubmission.appeal_url && (
                                <Button asChild variant="outline">
                                    <Link href={latestSubmission.appeal_url}>Open Appeal</Link>
                                </Button>
                            )}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-5">
                    {isViewingActiveSubmission && latestSubmission ? (
                        <IpcrPaperForm value={latestSubmission.form_payload} mode="review" />
                    ) : formPayload ? (
                        <>
                            <IpcrPaperForm
                                value={formPayload}
                                mode="employee"
                                onChange={setFormPayload}
                            />
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => setFormPayload(draftFormPayload)}
                                    disabled={processing}
                                >
                                    Reset Draft
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto"
                                    disabled={!canSubmit}
                                    onClick={handleSubmit}
                                >
                                    {processing ? 'Submitting...' : 'Submit IPCR'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                            No employee profile is linked to this account yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
