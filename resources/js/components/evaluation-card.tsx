import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { saveEvaluation } from '@/actions/App/Http/Controllers/IwrController';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getAppealEvidenceUrl, getFileName } from '@/lib/ipcr';
import type { IpcrEmployee, IpcrFormPayload, IpcrSubmission } from '@/types';

type Props = {
    employee: IpcrEmployee | null;
    submission: IpcrSubmission | null;
    draftFormPayload: IpcrFormPayload | null;
};

function rowCount(formPayload: IpcrFormPayload | null): number {
    if (!formPayload) {
        return 0;
    }

    return formPayload.sections.reduce((sum, section) => sum + section.rows.length, 0);
}

export default function EvaluationCard({
    employee,
    submission,
    draftFormPayload,
}: Props) {
    const [formPayload, setFormPayload] = useState<IpcrFormPayload | null>(submission?.form_payload ?? draftFormPayload);
    const [remarks, setRemarks] = useState(submission?.remarks ?? '');
    const [processing, setProcessing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        setFormPayload(submission?.form_payload ?? draftFormPayload);
        setRemarks(submission?.remarks ?? '');
    }, [draftFormPayload, submission]);

    const totalRows = rowCount(formPayload);
    const ratedRows = formPayload?.summary.rated_rows ?? 0;
    const averageScore = formPayload?.summary.computed_rating ?? null;
    const isReevaluation = submission?.hr_cycle_count || submission?.pmt_cycle_count;
    const isFailing = averageScore !== null && averageScore < 3.0;
    const canSubmit = Boolean(employee && formPayload && ratedRows === totalRows && totalRows > 0 && remarks.trim() && !processing);

    const confirmationMessage = useMemo(() => {
        if (!submission) {
            return 'This evaluation will be routed to HR checking after you confirm.';
        }

        if ((submission.hr_cycle_count > 0 || submission.pmt_cycle_count > 0) && submission.stage === 'sent_to_evaluator') {
            return 'This IPCR was returned for re-evaluation. Confirm that the updated scores and remarks are ready to be routed back to HR.';
        }

        return 'Confirm that the Q/E/T ratings and evaluator remarks are final. This will route the IPCR to HR checking.';
    }, [submission]);

    function handleSubmit(): void {
        if (!employee || !formPayload) {
            return;
        }

        setProcessing(true);
        router.post(
            saveEvaluation.url(),
            {
                employee_id: employee.employee_id,
                confirmed: true,
                remarks: remarks.trim(),
                form_payload: formPayload,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setConfirmOpen(false);
                },
            },
        );
    }

    return (
        <Card className="glass-card mx-auto w-full min-w-0 max-w-7xl overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="gap-4 border-b border-border bg-card">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                        Evaluator Workspace
                    </div>
                    <CardTitle className="mt-2 text-xl">
                        {employee
                            ? <>Evaluating <span className="text-[#2F5E2B] dark:text-[#9AC68E]">{employee.name}</span></>
                            : 'No Employee Selected'}
                    </CardTitle>
                    <CardDescription>
                        {employee
                            ? employee.job_title
                            : 'Open this page from the Document Management table to evaluate an employee.'}
                    </CardDescription>
                </div>

                {submission && (
                    <>
                        <IpcrWorkflowStepper
                            stage={submission.stage}
                            status={submission.status}
                            isEscalated={submission.is_escalated}
                        />
                        {submission.is_escalated && (
                            <EscalationWarning reason={submission.escalation_reason} />
                        )}
                    </>
                )}

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Rows Rated: {ratedRows}/{totalRows}</Badge>
                    <Badge variant="outline">
                        Computed Rating: {averageScore !== null ? averageScore.toFixed(2) : 'Pending'}
                    </Badge>
                    {isReevaluation ? <Badge variant="outline">Re-evaluation Cycle</Badge> : null}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {submission?.appeal?.appeal_reason ? (
                    <div className="glass-card rounded-[26px] border border-sky-300/70 bg-sky-50/80 p-5 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.14)]" />
                            <h3 className="text-sm font-semibold tracking-[0.18em] text-sky-900 uppercase dark:text-sky-100">
                                Employee Appeal
                            </h3>
                        </div>
                        <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                            {submission.appeal.appeal_reason}
                        </p>
                        {(submission.appeal.evidence_files?.length ?? 0) > 0 ? (
                            <div className="mt-4 space-y-2">
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-700 uppercase dark:text-sky-300">
                                    Attached Evidence
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(submission.appeal.evidence_files ?? []).map(
                                        (file, index) => (
                                            <Button
                                                key={`${file}-${index}`}
                                                asChild
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                            >
                                                <a
                                                    href={getAppealEvidenceUrl(
                                                        submission.appeal!.id,
                                                        index,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {getFileName(file)}
                                                </a>
                                            </Button>
                                        ),
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {isReevaluation && (submission?.hr_remarks || submission?.pmt_remarks) ? (
                    <div className="glass-card rounded-[26px] border border-amber-300/70 bg-amber-50/80 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.14)]" />
                            <h3 className="text-sm font-semibold tracking-[0.18em] text-amber-900 uppercase dark:text-amber-100">
                                Previous Review Feedback
                            </h3>
                        </div>
                        <p className="mb-4 text-xs leading-5 text-amber-900/80 dark:text-amber-100/80">
                            This IPCR was returned for re-evaluation. Address the feedback below before re-routing.
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {submission?.hr_remarks ? (
                                <div className="rounded-2xl border border-amber-200 bg-white/80 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">
                                        HR Personnel Remarks
                                    </p>
                                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">
                                        {submission.hr_remarks}
                                    </p>
                                    {submission.hr_cycle_count > 0 ? (
                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                            HR cycle count: {submission.hr_cycle_count}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            {submission?.pmt_remarks ? (
                                <div className="rounded-2xl border border-amber-200 bg-white/80 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">
                                        PMT Remarks
                                    </p>
                                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">
                                        {submission.pmt_remarks}
                                    </p>
                                    {submission.pmt_cycle_count > 0 ? (
                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                            PMT cycle count: {submission.pmt_cycle_count}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {formPayload ? (
                    <IpcrPaperForm
                        value={formPayload}
                        mode="evaluator"
                        onChange={setFormPayload}
                    />
                ) : (
                    <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                        No draft form is available for this employee yet.
                    </div>
                )}

                <div className="glass-card rounded-[26px] border border-border bg-card p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="size-2 rounded-full bg-[#4A7C3C] shadow-[0_0_0_4px_rgba(74,124,60,0.15)]" />
                        <label className="text-sm font-semibold text-foreground">Evaluator Remarks</label>
                    </div>
                    <Textarea
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Summarize the evaluation findings and any corrective instructions for the employee."
                        className="min-h-28 resize-y border-border bg-background"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                        {isFailing
                            ? 'Required — provide corrective guidance for the employee before routing.'
                            : 'Required — remarks are visible to the employee after finalization.'}
                    </p>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setFormPayload(submission?.form_payload ?? draftFormPayload);
                            setRemarks(submission?.remarks ?? '');
                        }}
                        disabled={processing}
                    >
                        Reset
                    </Button>
                    <Button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => setConfirmOpen(true)}
                    >
                        {processing ? 'Saving...' : 'Submit Evaluation'}
                    </Button>
                </div>
            </CardContent>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Evaluator Submission</DialogTitle>
                        <DialogDescription>{confirmationMessage}</DialogDescription>
                    </DialogHeader>
                    {submission?.is_escalated && (
                        <EscalationWarning reason={submission.escalation_reason} />
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || processing}
                        >
                            {processing ? 'Routing...' : 'Confirm and Route'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
