import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Database,
    RotateCcw,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { savePmtReview } from '@/actions/App/Http/Controllers/IwrController';
import EscalationWarning from '@/components/escalation-warning';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import IpcrWorkflowStepper from '@/components/ipcr-workflow-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { getFileName } from '@/lib/ipcr';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem, IpcrSubmission } from '@/types';

type PaginatedSubmissions = {
    data: IpcrSubmission[];
    current_page: number;
    last_page: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'PMT Review', href: admin.pmtReview().url },
];

function StatCard({
    title,
    value,
    icon: Icon,
    color,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
        emerald:
            'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        red: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
    };

    const iconColorMap: Record<string, string> = {
        blue: 'text-blue-600 dark:text-blue-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
    };

    return (
        <div
            className={`glass-card flex flex-col gap-3 rounded-[26px] border p-4 shadow-sm ${colorMap[color]}`}
        >
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/60 p-2.5 shadow-sm dark:bg-white/10">
                    <Icon className={`size-5 ${iconColorMap[color]}`} />
                </div>
                <div>
                    <p className="text-2xl leading-none font-bold">{value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {title}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function PmtReview({
    submissions,
}: {
    submissions: PaginatedSubmissions;
}) {
    const [selected, setSelected] = useState<IpcrSubmission | null>(null);
    const [decision, setDecision] = useState<'approved' | 'rejected' | null>(
        null,
    );
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    function handleSubmit(): void {
        if (!selected || !decision) {
            return;
        }

        setProcessing(true);
        router.post(
            savePmtReview.url(selected.id),
            {
                pmt_decision: decision,
                pmt_remarks: decision === 'rejected' ? remarks.trim() : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('PMT review saved.');
                    setSelected(null);
                    setDecision(null);
                    setRemarks('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PMT Review" />
            <div className="app-page-shell app-page-stack">
                <div className="app-stats-grid">
                    <StatCard
                        title="Pending Review"
                        value={submissions.total}
                        icon={Clock3}
                        color="amber"
                    />
                    <StatCard
                        title="Appealed"
                        value={
                            submissions.data.filter(
                                (submission) =>
                                    submission.appeal_status === 'appealed',
                            ).length
                        }
                        icon={Database}
                        color="blue"
                    />
                    <StatCard
                        title="Return Cycles"
                        value={
                            submissions.data.filter(
                                (submission) => submission.pmt_cycle_count > 0,
                            ).length
                        }
                        icon={RotateCcw}
                        color="emerald"
                    />
                    <StatCard
                        title="Escalated"
                        value={
                            submissions.data.filter(
                                (submission) => submission.is_escalated,
                            ).length
                        }
                        icon={ShieldAlert}
                        color="red"
                    />
                </div>

                <Card className="glass-card overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle>Submissions Awaiting PMT Review</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] text-white dark:bg-[#1F3F1D] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold">
                                    <th>Employee</th>
                                    <th>Rating</th>
                                    <th>Appeal Status</th>
                                    <th>Cycle</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.data.map((submission, index) => (
                                    <tr
                                        key={submission.id}
                                        className={
                                            index % 2 === 0
                                                ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80'
                                                : 'bg-[#BFDDB5] dark:bg-[#274827]/80'
                                        }
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {submission.employee?.name ??
                                                submission.employee_id}
                                        </td>
                                        <td className="px-4 py-3">
                                            {submission.performance_rating?.toFixed(
                                                2,
                                            ) ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 capitalize">
                                            {submission.appeal_status ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {submission.pmt_cycle_count}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelected(submission);
                                                    setDecision(null);
                                                    setRemarks(
                                                        submission.pmt_remarks ??
                                                            '',
                                                    );
                                                }}
                                            >
                                                Review
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {submissions.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="bg-[#DDEFD7] px-4 py-8 text-center text-muted-foreground dark:bg-[#345A34]/80"
                                        >
                                            No submissions awaiting PMT review.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelected(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>PMT Review</DialogTitle>
                        <DialogDescription>
                            {selected?.employee?.name} — current score{' '}
                            {selected?.performance_rating?.toFixed(2) ?? 'N/A'}
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-5">
                            <IpcrWorkflowStepper
                                stage={selected.stage}
                                status={selected.status}
                                isEscalated={selected.is_escalated}
                            />

                            {selected.is_escalated && (
                                <EscalationWarning
                                    reason={selected.escalation_reason}
                                />
                            )}

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    PMT Cycle: {selected.pmt_cycle_count}
                                </Badge>
                                <Badge variant="outline">
                                    Appeal Status:{' '}
                                    {selected.appeal_status ?? 'none'}
                                </Badge>
                            </div>

                            <IpcrPaperForm
                                value={selected.form_payload}
                                mode="review"
                            />

                            {selected.appeal_status === 'appealed' &&
                                selected.appeal && (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                                Appeal Reason
                                            </p>
                                            <p className="mt-2 text-sm leading-relaxed">
                                                {selected.appeal.appeal_reason}
                                            </p>
                                            {selected.appeal
                                                .appeal_evidence_description && (
                                                <>
                                                    <p className="mt-4 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                                        Evidence Description
                                                    </p>
                                                    <p className="mt-2 text-sm leading-relaxed">
                                                        {
                                                            selected.appeal
                                                                .appeal_evidence_description
                                                        }
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                                Evidence Files
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {selected.appeal.evidence_files.map(
                                                    (path) => (
                                                        <Badge
                                                            key={path}
                                                            variant="outline"
                                                        >
                                                            {getFileName(path)}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    variant={
                                        decision === 'approved'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className={
                                        decision === 'approved'
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : ''
                                    }
                                    onClick={() => setDecision('approved')}
                                >
                                    <CheckCircle2 className="mr-1.5 size-4" />
                                    Approve for Finalization
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        decision === 'rejected'
                                            ? 'destructive'
                                            : 'outline'
                                    }
                                    onClick={() => setDecision('rejected')}
                                >
                                    <RotateCcw className="mr-1.5 size-4" />
                                    Return to Evaluator
                                </Button>
                            </div>

                            {decision === 'rejected' && (
                                <Textarea
                                    value={remarks}
                                    onChange={(event) =>
                                        setRemarks(event.target.value)
                                    }
                                    placeholder={
                                        selected.pmt_cycle_count > 0
                                            ? 'Provide PMT remarks. Another return will escalate this submission.'
                                            : 'Provide the policy or compliance issues that require re-evaluation.'
                                    }
                                    className="min-h-24"
                                />
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelected(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                !decision ||
                                (decision === 'rejected' && !remarks.trim()) ||
                                processing
                            }
                            onClick={handleSubmit}
                        >
                            {processing ? 'Saving…' : 'Submit Review'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
