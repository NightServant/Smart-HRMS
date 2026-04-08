import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    submitAppeal,
    submitNoAppeal,
} from '@/actions/App/Http/Controllers/IwrController';
import AppealCountdown from '@/components/appeal-countdown';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import PageIntro from '@/components/page-intro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { getAppealEvidenceUrl, getFileName } from '@/lib/ipcr';
import { submitEvaluation } from '@/routes';
import type { BreadcrumbItem, IpcrSubmission } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Submit Evaluation', href: submitEvaluation().url },
    { title: 'IPCR Appeal', href: '#' },
];

export default function IpcrAppeal({
    submission,
}: {
    submission: IpcrSubmission;
}) {
    const [currentTimestamp] = useState(() => Date.now());
    const evaluatorRemarks =
        submission.remarks ??
        submission.form_payload.workflow_notes.evaluator_remarks ??
        null;
    const hrRemarks =
        submission.hr_remarks ??
        submission.form_payload.workflow_notes.hr_remarks ??
        null;
    const [appealReason, setAppealReason] = useState(
        submission.appeal?.appeal_reason ?? '',
    );
    const [appealEvidenceDescription, setAppealEvidenceDescription] = useState(
        submission.appeal?.appeal_evidence_description ?? '',
    );
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);

    const isExpired = useMemo(() => {
        if (!submission.appeal_window_closes_at) {
            return true;
        }

        return new Date(submission.appeal_window_closes_at).getTime() <= currentTimestamp;
    }, [currentTimestamp, submission.appeal_window_closes_at]);

    const canSubmitAppeal =
        !isExpired &&
        appealReason.trim().length > 0 &&
        files.length > 0 &&
        !processing;

    function handleAcceptResults(): void {
        if (isExpired) {
            return;
        }

        setProcessing(true);
        router.post(
            submitNoAppeal.url(submission.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    function handleSubmitAppeal(): void {
        if (!canSubmitAppeal) {
            return;
        }

        setProcessing(true);
        router.post(
            submitAppeal.url(submission.id),
            {
                appeal_reason: appealReason.trim(),
                appeal_evidence_description:
                    appealEvidenceDescription.trim() || null,
                evidence_files: files,
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Appeal" />
            <div className="app-page-shell app-page-stack max-w-7xl">
                <PageIntro
                    eyebrow="Employee · IPCR Appeal"
                    title="Appeal Window"
                    description="Review the evaluated paper form, accept the results, or submit a documented appeal with supporting files."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                                Score:{' '}
                                {submission.performance_rating?.toFixed(2) ??
                                    'Pending'}
                            </Badge>
                            <Badge variant="outline">
                                Status: {submission.status ?? 'Pending'}
                            </Badge>
                        </div>
                    }
                />
                <Card className="glass-card overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="gap-4 border-b border-border bg-card">
                        <CardTitle className="sr-only">
                            Appeal Workflow
                        </CardTitle>

                        <IpcrWorkflowStepper
                            stage={submission.stage}
                            status={submission.status}
                            isEscalated={submission.is_escalated}
                        />

                        {submission.is_escalated && (
                            <EscalationWarning
                                reason={submission.escalation_reason}
                            />
                        )}

                        {submission.appeal_window_closes_at && (
                            <AppealCountdown
                                closesAt={submission.appeal_window_closes_at}
                            />
                        )}
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <IpcrPaperForm
                            value={submission.form_payload}
                            mode="review"
                        />

                        {(evaluatorRemarks || hrRemarks) && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                    <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                        Evaluator Remarks
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed">
                                        {evaluatorRemarks ?? '—'}
                                    </p>
                                </div>
                                <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                    <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                        HR Remarks
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed">
                                        {hrRemarks ?? '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                            <div className="glass-card space-y-4 rounded-[26px] border border-border bg-card p-5 shadow-sm">
                                <div className="space-y-2">
                                    <Label htmlFor="appeal-reason">
                                        Appeal Reason
                                    </Label>
                                    <Textarea
                                        id="appeal-reason"
                                        value={appealReason}
                                        onChange={(event) =>
                                            setAppealReason(event.target.value)
                                        }
                                        disabled={isExpired || processing}
                                        placeholder="Explain the portion of the evaluation you are appealing."
                                        className="min-h-28 border-border bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appeal-description">
                                        Evidence Description
                                    </Label>
                                    <Textarea
                                        id="appeal-description"
                                        value={appealEvidenceDescription}
                                        onChange={(event) =>
                                            setAppealEvidenceDescription(
                                                event.target.value,
                                            )
                                        }
                                        disabled={isExpired || processing}
                                        placeholder="List the accomplishment documents or records attached to this appeal."
                                        className="min-h-24 border-border bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appeal-files">
                                        Supporting Files
                                    </Label>
                                    <Input
                                        id="appeal-files"
                                        type="file"
                                        multiple
                                        disabled={isExpired || processing}
                                        onChange={(event) =>
                                            setFiles(
                                                Array.from(
                                                    event.target.files ?? [],
                                                ),
                                            )
                                        }
                                        className="border-border bg-background"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((file) => (
                                            <Badge
                                                key={file.name}
                                                variant="outline"
                                            >
                                                {file.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card space-y-4 rounded-[26px] border border-border bg-card p-5 shadow-sm">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Current Appeal State
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        If you do not submit an appeal before
                                        the countdown expires, the system will
                                        automatically route this IPCR to PMT
                                        review.
                                    </p>
                                </div>
                                {submission.appeal?.evidence_files?.length ? (
                                    <div className="space-y-2">
                                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                            Previously Uploaded Files
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {submission.appeal.evidence_files.map(
                                                (path, index) => (
                                                    <Button
                                                        key={path}
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <a
                                                            href={getAppealEvidenceUrl(
                                                                submission
                                                                    .appeal?.id ??
                                                                    0,
                                                                index,
                                                            )}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            {getFileName(path)}
                                                        </a>
                                                    </Button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isExpired || processing}
                                        onClick={handleAcceptResults}
                                    >
                                        {processing
                                            ? 'Processing...'
                                            : 'Accept Results / No Appeal'}
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={!canSubmitAppeal}
                                        onClick={handleSubmitAppeal}
                                    >
                                        {processing
                                            ? 'Submitting...'
                                            : 'Submit Appeal'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
