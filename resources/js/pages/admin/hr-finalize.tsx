import { Head, router } from '@inertiajs/react';
import { Calculator, CheckCircle2, Clock3, Database, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { finalizeIpcr } from '@/actions/App/Http/Controllers/IwrController';
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
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem, IpcrSubmission } from '@/types';

type PaginatedSubmissions = {
    data: IpcrSubmission[];
    current_page: number;
    last_page: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'IPCR Finalization', href: admin.hrFinalize().url },
];

function computedRating(submission: IpcrSubmission): number | null {
    return submission.form_payload.summary.computed_rating ?? submission.performance_rating;
}

function finalDisplayRating(submission: IpcrSubmission): number | null {
    return submission.final_rating ?? computedRating(submission);
}

function StatCard({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
}) {
    return (
        <div className="glass-card flex flex-col gap-3 rounded-[26px] border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/60 p-2.5 shadow-sm dark:bg-white/10">
                    <Icon className="size-5 text-primary" />
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

export default function HrFinalize({
    submissions,
}: {
    submissions: PaginatedSubmissions;
}) {
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [selected, setSelected] = useState<IpcrSubmission | null>(null);
    const [finalRating, setFinalRating] = useState('');
    const [processing, setProcessing] = useState(false);
    const [notifyingTrainingSubmissionId, setNotifyingTrainingSubmissionId] =
        useState<number | null>(null);

    const periodGroups = submissions.data.reduce<Record<string, IpcrSubmission[]>>(
        (acc, sub) => {
            const key = sub.form_payload.metadata.period ?? 'Unknown Period';
            if (!acc[key]) acc[key] = [];
            acc[key].push(sub);
            return acc;
        },
        {},
    );
    const periods = Object.keys(periodGroups);
    const periodRows = selectedPeriod ? (periodGroups[selectedPeriod] ?? []) : [];

    function notifyTrainingSuggestions(submissionId: number): void {
        setNotifyingTrainingSubmissionId(submissionId);

        router.post(
            '/admin/training-suggestions/notify',
            {
                submission_id: submissionId,
            },
            {
                preserveScroll: true,
                onFinish: () => setNotifyingTrainingSubmissionId(null),
            },
        );
    }

    useEffect(() => {
        if (selected) {
            setFinalRating(
                String(
                    finalDisplayRating(selected) ?? '',
                ),
            );
        }
    }, [selected]);

    function handleFinalize(): void {
        if (!selected || finalRating === '') {
            return;
        }

        setProcessing(true);
        router.post(
            finalizeIpcr.url(selected.id),
            {
                final_rating: finalRating,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('IPCR finalized.');
                    setSelected(null);
                    setFinalRating('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Finalization" />
            <div className="app-page-shell app-page-stack">
                <div className="app-stats-grid">
                    <StatCard
                        title="Pending Finalization"
                        value={submissions.total}
                        icon={Clock3}
                    />
                    <StatCard
                        title="Queued on Page"
                        value={submissions.data.length}
                        icon={Database}
                    />
                    <StatCard
                        title="With PMT Review"
                        value={
                            submissions.data.filter(
                                (submission) =>
                                    submission.pmt_reviewer !== null,
                            ).length
                        }
                        icon={CheckCircle2}
                    />
                    <StatCard
                        title="Needs Rating Entry"
                        value={
                            submissions.data.filter(
                                (submission) =>
                                    submission.final_rating === null,
                            ).length
                        }
                        icon={Calculator}
                    />
                </div>

                <Card className="glass-card overflow-hidden border border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card">
                        <CardTitle>Finalization Periods</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] text-white dark:bg-[#1F3F1D] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold">
                                    <th>Period</th>
                                    <th>Pending</th>
                                    <th className="!text-center">View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map((period, index) => (
                                    <tr
                                        key={period}
                                        className={index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}
                                    >
                                        <td className="px-4 py-3 font-medium">{period}</td>
                                        <td className="px-4 py-3">{periodGroups[period].length}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="sm" variant="outline" onClick={() => setSelectedPeriod(period)}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {periods.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="bg-[#DDEFD7] px-4 py-8 text-center text-muted-foreground dark:bg-[#345A34]/80">
                                            No submissions awaiting finalization.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            {/* Period Detail Dialog */}
            <Dialog
                open={selectedPeriod !== null}
                onOpenChange={(open) => !open && setSelectedPeriod(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>Finalization — {selectedPeriod}</DialogTitle>
                        <DialogDescription>
                            {periodRows.length} submission{periodRows.length === 1 ? '' : 's'} awaiting finalization for this period.
                        </DialogDescription>
                    </DialogHeader>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#2F5E2B] text-white dark:bg-[#1F3F1D] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold">
                                <th>Employee</th>
                                <th>Computed Rating</th>
                                <th>PMT Reviewer</th>
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periodRows.map((submission, index) => (
                                <tr
                                    key={submission.id}
                                    className={index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {submission.employee?.name ?? submission.employee_id}
                                    </td>
                                    <td className="px-4 py-3">
                                        {computedRating(submission)?.toFixed(2) ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {submission.pmt_reviewer?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setSelected(submission)}>
                                                Finalize
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2"
                                                disabled={notifyingTrainingSubmissionId === submission.id}
                                                onClick={() => notifyTrainingSuggestions(submission.id)}
                                            >
                                                <Megaphone className="size-4" />
                                                {notifyingTrainingSubmissionId === submission.id ? 'Sending...' : 'Notify Training'}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {periodRows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="bg-[#DDEFD7] px-4 py-8 text-center text-muted-foreground dark:bg-[#345A34]/80">
                                        No submissions for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPeriod(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelected(null);
                    }
                }}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>Finalize IPCR</DialogTitle>
                        <DialogDescription>
                            {selected?.employee?.name} — enter the final rating
                            to complete the workflow.
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-5">
                            <IpcrWorkflowStepper
                                stage={selected.stage}
                                status={selected.status}
                                isEscalated={selected.is_escalated}
                            />

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Computed Rating:{' '}
                                    {selected.performance_rating?.toFixed(2) ??
                                        '—'}
                                </Badge>
                                <Badge variant="outline">
                                    PMT Reviewer:{' '}
                                    {selected.pmt_reviewer?.name ?? '—'}
                                </Badge>
                            </div>

                            {(() => {
                                const selectedDept = selected.form_payload?.metadata?.department;
                                const selectedPeriod = selected.form_payload?.metadata?.period;
                                const deptPeers = submissions.data
                                    .filter(
                                        (s) =>
                                            s.form_payload?.metadata?.department === selectedDept &&
                                            s.form_payload?.metadata?.period === selectedPeriod,
                                    )
                                    .sort((a, b) => (b.performance_rating ?? 0) - (a.performance_rating ?? 0));

                                if (deptPeers.length <= 1) return null;

                                const topPeers = deptPeers.slice(0, 3);
                                const atRiskPeers = [...deptPeers].reverse().slice(0, 3);

                                return (
                                    <div className="glass-card space-y-3 rounded-[26px] border border-border bg-card p-4">
                                        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                            Department Context{selectedDept ? ` — ${selectedDept}` : ''}
                                        </p>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <p className="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Top Performers</p>
                                                {topPeers.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className={`flex justify-between py-0.5 text-xs ${s.id === selected.id ? 'font-bold text-brand-700 dark:text-brand-300' : 'text-foreground'}`}
                                                    >
                                                        <span className="truncate">{s.employee?.name ?? '—'}</span>
                                                        <span className="font-mono">{s.performance_rating?.toFixed(2) ?? '—'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div>
                                                <p className="mb-1 text-xs font-semibold text-red-600 dark:text-red-400">At Risk</p>
                                                {atRiskPeers.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className={`flex justify-between py-0.5 text-xs ${s.id === selected.id ? 'font-bold text-brand-700 dark:text-brand-300' : 'text-foreground'}`}
                                                    >
                                                        <span className="truncate">{s.employee?.name ?? '—'}</span>
                                                        <span className="font-mono">{s.performance_rating?.toFixed(2) ?? '—'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <IpcrPaperForm
                                value={selected.form_payload}
                                mode="review"
                            />

                            <div className="grid gap-4">
                                <div className="glass-card space-y-2 rounded-[26px] border border-border bg-card p-4 shadow-sm">
                                    <label className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                        Final Rating
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        step="0.01"
                                        value={finalRating}
                                        onChange={(event) =>
                                            setFinalRating(event.target.value)
                                        }
                                        className="border-border bg-background"
                                    />
                                </div>
                            </div>
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
                            disabled={processing || finalRating === ''}
                            onClick={handleFinalize}
                        >
                            {processing ? 'Finalizing…' : 'Finalize IPCR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
