import { Head, router } from '@inertiajs/react';
import { Calculator, CheckCircle2, Clock3, Database } from 'lucide-react';
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
import { getAdjectivalRating } from '@/lib/ipcr';
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
    const [selected, setSelected] = useState<IpcrSubmission | null>(null);
    const [finalRating, setFinalRating] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (selected) {
            setFinalRating(
                String(
                    selected.final_rating ?? selected.performance_rating ?? '',
                ),
            );
        }
    }, [selected]);

    const adjectivalPreview =
        finalRating === '' ? null : getAdjectivalRating(Number(finalRating));

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
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle>Submissions Awaiting Finalization</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#2F5E2B] text-white dark:bg-[#1F3F1D] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold">
                                    <th>Employee</th>
                                    <th>Computed Rating</th>
                                    <th>PMT Reviewer</th>
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
                                        <td className="px-4 py-3">
                                            {submission.pmt_reviewer?.name ??
                                                '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setSelected(submission)
                                                }
                                            >
                                                Finalize
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {submissions.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="bg-[#DDEFD7] px-4 py-8 text-center text-muted-foreground dark:bg-[#345A34]/80"
                                        >
                                            No submissions awaiting
                                            finalization.
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

                            <IpcrPaperForm
                                value={selected.form_payload}
                                mode="review"
                            />

                            <div className="grid gap-4 md:grid-cols-2">
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
                                <div className="glass-card space-y-2 rounded-[26px] border border-emerald-300/70 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                                    <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                        Adjectival Preview
                                    </p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {adjectivalPreview ?? 'Pending'}
                                    </p>
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
