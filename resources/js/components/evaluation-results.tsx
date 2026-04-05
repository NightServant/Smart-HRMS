import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IpcrEmployee, IpcrSubmission } from '@/types';

type Props = {
    employee: IpcrEmployee;
    submission: IpcrSubmission;
};

export default function EvaluationResults({ employee, submission }: Props) {
    const evaluatorRemarks = submission.remarks ?? submission.form_payload.workflow_notes.evaluator_remarks ?? null;
    const hrRemarks = submission.hr_remarks ?? submission.form_payload.workflow_notes.hr_remarks ?? null;
    const pmtRemarks = submission.pmt_remarks ?? submission.form_payload.workflow_notes.pmt_remarks ?? null;

    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
            <Card className="min-w-0 border-primary/20 bg-card shadow-sm">
                <CardHeader className="space-y-4">
                    <div className="space-y-2">
                        <CardTitle>IPCR Evaluation Snapshot</CardTitle>
                        <CardDescription>
                            {employee.name} — {employee.job_title}
                        </CardDescription>
                    </div>

                    <IpcrWorkflowStepper
                        stage={submission.stage}
                        status={submission.status}
                        isEscalated={submission.is_escalated}
                    />

                    {submission.is_escalated && (
                        <EscalationWarning reason={submission.escalation_reason} />
                    )}

                    {submission.appeal_status === 'appeal_window_open' && submission.appeal_window_closes_at && (
                        <AppealCountdown closesAt={submission.appeal_window_closes_at} />
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            Performance Rating: {submission.performance_rating !== null ? submission.performance_rating.toFixed(2) : 'Pending'}
                        </Badge>
                        {submission.final_rating !== null && (
                            <Badge variant="outline">
                                Final Rating: {submission.final_rating.toFixed(2)}
                            </Badge>
                        )}
                        <Badge variant="outline">
                            Adjectival: {submission.adjectival_rating ?? submission.form_payload.summary.adjectival_rating ?? 'Pending'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <IpcrPaperForm value={submission.form_payload} mode="review" />

                    {(evaluatorRemarks || hrRemarks || pmtRemarks) && (
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Evaluator Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{evaluatorRemarks ?? '—'}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">HR Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{hrRemarks ?? '—'}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">PMT Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{pmtRemarks ?? '—'}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
