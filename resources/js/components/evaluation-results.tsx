import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { IpcrEmployee, IpcrSubmission } from '@/types';

type Props = {
    employee: IpcrEmployee;
    submission: IpcrSubmission;
};

function ratingBadgeClass(rating: number | null): string {
    if (rating === null) return '';
    if (rating >= 4.5) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (rating >= 3.5) return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300';
    if (rating >= 3.0) return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
    if (rating >= 2.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300';
}

export default function EvaluationResults({ employee, submission }: Props) {
    const evaluatorRemarks = submission.remarks ?? submission.form_payload.workflow_notes.evaluator_remarks ?? null;
    const hrRemarks = submission.hr_remarks ?? submission.form_payload.workflow_notes.hr_remarks ?? null;
    const pmtRemarks = submission.pmt_remarks ?? submission.form_payload.workflow_notes.pmt_remarks ?? null;

    const perfRating = submission.performance_rating;
    const finalRating = submission.final_rating;
    const perfBadgeClass = ratingBadgeClass(perfRating);
    const finalBadgeClass = ratingBadgeClass(finalRating);

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
                        {perfRating !== null ? (
                            <Badge className={perfBadgeClass}>
                                Performance Rating: {perfRating.toFixed(2)}
                            </Badge>
                        ) : (
                            <Badge variant="outline">Performance Rating: Pending</Badge>
                        )}
                        {finalRating !== null && (
                            <Badge className={finalBadgeClass}>
                                Final Rating: {finalRating.toFixed(2)}
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
                            <div className="rounded-xl border border-l-4 border-l-[#4A7C3C] bg-[#DDEFD7]/40 p-4 dark:bg-[#274827]/30">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2F5E2B] dark:text-[#9AC68E]">Evaluator Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{evaluatorRemarks ?? '—'}</p>
                            </div>
                            <div className="rounded-xl border border-l-4 border-l-sky-500 bg-sky-50/60 p-4 dark:bg-sky-950/20">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">HR Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{hrRemarks ?? '—'}</p>
                            </div>
                            <div className="rounded-xl border border-l-4 border-l-purple-500 bg-purple-50/60 p-4 dark:bg-purple-950/20">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">PMT Remarks</p>
                                <p className="mt-2 text-sm leading-relaxed">{pmtRemarks ?? '—'}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
