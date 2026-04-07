import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CheckCircle2,
    Clock3,
    FileCheck2,
    FileSpreadsheet,
    Megaphone,
    RotateCcw,
    Send,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { IpcrTarget } from '@/types/ipcr';

type CurrentTargetPeriod = {
    semester: 1 | 2;
    year: number;
    label: string;
    submissionOpen: boolean;
    submissionWindowLabel: string;
};

type Stats = {
    pending: number;
    approvedByEvaluator: number;
    rejected: number;
    finalized: number;
};

type PageProps = {
    currentTargetPeriod: CurrentTargetPeriod;
    submittedTargets: IpcrTarget[];
    finalizedTargets: IpcrTarget[];
    stats: Stats;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Performance Evaluation', href: '/admin/ipcr/target-management' },
    { title: 'IPCR Target', href: '/admin/ipcr/target-management' },
];

const stripedRows = [
    'bg-[#DDEFD7] dark:bg-[#345A34]/80',
    'bg-[#BFDDB5] dark:bg-[#274827]/80',
];
const tableHeaderClass =
    'bg-[#2F5E2B] text-white dark:bg-[#1F3F1D] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold';

function semesterLabel(semester: 1 | 2, year: number): string {
    return semester === 1
        ? `First Semester (January–June) ${year}`
        : `Second Semester (July–December) ${year}`;
}

function decisionBadge(decision: string | null | undefined): React.ReactNode {
    if (decision === 'approved') {
        return (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Approved
            </Badge>
        );
    }

    if (decision === 'rejected') {
        return (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                Returned
            </Badge>
        );
    }

    return <Badge variant="outline">Pending Evaluator</Badge>;
}

function StatCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: 'amber' | 'emerald' | 'red' | 'blue';
}) {
    const colorMap = {
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        emerald:
            'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        red: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
    };
    const iconColorMap = {
        amber: 'text-amber-600 dark:text-amber-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <div
            className={cn(
                'glass-card flex flex-col gap-3 rounded-[26px] border p-4 shadow-sm',
                colorMap[color],
            )}
        >
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/60 p-2.5 shadow-sm dark:bg-white/10">
                    <Icon className={cn('size-5', iconColorMap[color])} />
                </div>
                <div>
                    <p className="text-2xl leading-none font-bold">{value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {label}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function IpcrTargetManagement() {
    const { currentTargetPeriod, submittedTargets, finalizedTargets, stats } =
        usePage<PageProps>().props;

    const [view, setView] = useState<'submitted' | 'finalized'>('submitted');
    const [selectedTarget, setSelectedTarget] = useState<IpcrTarget | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);

    // Opening control state
    const [openSemester, setOpenSemester] = useState<string>('1');
    const [openYear, setOpenYear] = useState<string>(
        String(currentTargetPeriod.year),
    );
    const [notifying, setNotifying] = useState(false);

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

    const displayRows = view === 'submitted' ? submittedTargets : finalizedTargets;

    function handleFinalize(target: IpcrTarget): void {
        setProcessing(true);
        router.post(
            `/admin/ipcr/target-finalize/${target.id}`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setSelectedTarget(null),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function handleOpenAndNotify(): void {
        setNotifying(true);
        router.post(
            '/admin/ipcr/target-notify',
            { semester: Number(openSemester), year: Number(openYear) },
            {
                preserveScroll: true,
                onFinish: () => setNotifying(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Target Management" />
            <div className="app-page-shell app-page-stack pb-10">
                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Pending Evaluator Review"
                        value={stats.pending}
                        icon={Clock3}
                        color="amber"
                    />
                    <StatCard
                        label="Approved by Evaluator"
                        value={stats.approvedByEvaluator}
                        icon={CheckCircle2}
                        color="emerald"
                    />
                    <StatCard
                        label="Returned to Employee"
                        value={stats.rejected}
                        icon={XCircle}
                        color="red"
                    />
                    <StatCard
                        label="Finalized by HR"
                        value={stats.finalized}
                        icon={FileCheck2}
                        color="blue"
                    />
                </div>

                {/* Opening Component */}
                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Megaphone className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                            <CardTitle className="text-lg">
                                Target Submission Opening
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Select the semester and year, then open the target
                            submission window and notify all employees to submit
                            their IPCR targets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Select
                                    value={openSemester}
                                    onValueChange={setOpenSemester}
                                >
                                    <SelectTrigger className="border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            First Semester (Jan–Jun)
                                        </SelectItem>
                                        <SelectItem value="2">
                                            Second Semester (Jul–Dec)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select
                                    value={openYear}
                                    onValueChange={setOpenYear}
                                >
                                    <SelectTrigger className="border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((y) => (
                                            <SelectItem
                                                key={y}
                                                value={String(y)}
                                            >
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={notifying}
                                    onClick={handleOpenAndNotify}
                                >
                                    {notifying ? (
                                        <>
                                            <Send className="size-4 animate-pulse" />
                                            Opening…
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="size-4" />
                                            Open &amp; Notify Employees
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Target List */}
                <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>
                                    {view === 'submitted'
                                        ? 'Submitted Targets'
                                        : 'Finalized Targets'}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {view === 'submitted'
                                        ? 'Review targets approved by supervisors and record them as finalized.'
                                        : 'Targets that have been officially recorded by HR.'}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={
                                        view === 'submitted'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setView('submitted')}
                                >
                                    <FileSpreadsheet className="size-4" />
                                    Submitted
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        view === 'finalized'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setView('finalized')}
                                >
                                    <FileCheck2 className="size-4" />
                                    Finalized
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={tableHeaderClass}>
                                        <th>Employee</th>
                                        <th>Period</th>
                                        <th>Submitted</th>
                                        <th>Evaluator Decision</th>
                                        <th>HR Status</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayRows.map((target, index) => (
                                        <tr
                                            key={target.id}
                                            className={stripedRows[index % 2]}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {target.employee?.name ??
                                                    target.employee_id}
                                            </td>
                                            <td className="px-4 py-3">
                                                {semesterLabel(
                                                    target.semester,
                                                    target.target_year,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {target.submitted_at
                                                    ? new Date(
                                                          target.submitted_at,
                                                      ).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {decisionBadge(
                                                    target.evaluator_decision,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {target.hr_finalized ? (
                                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                                        Finalized
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">
                                                        Not Recorded
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setSelectedTarget(
                                                            target,
                                                        )
                                                    }
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="bg-[#DDEFD7] px-4 py-10 text-center text-muted-foreground dark:bg-[#345A34]/80"
                                            >
                                                No{' '}
                                                {view === 'submitted'
                                                    ? 'submitted'
                                                    : 'finalized'}{' '}
                                                IPCR targets yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* View / Finalize Dialog */}
            <Dialog
                open={selectedTarget !== null}
                onOpenChange={(open) => !open && setSelectedTarget(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>IPCR Target Record</DialogTitle>
                        <DialogDescription>
                            {selectedTarget?.employee?.name ??
                                selectedTarget?.employee_id}{' '}
                            —{' '}
                            {selectedTarget
                                ? semesterLabel(
                                      selectedTarget.semester,
                                      selectedTarget.target_year,
                                  )
                                : ''}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTarget?.form_payload && (
                        <IpcrTargetReadonly
                            target={selectedTarget}
                            title="Employee Target Snapshot"
                            description="Review the target submitted by the employee and approved by their supervisor."
                        />
                    )}

                    {selectedTarget?.evaluator_remarks && (
                        <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                Evaluator Remarks
                            </p>
                            <p className="mt-2 text-sm leading-relaxed">
                                {selectedTarget.evaluator_remarks}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {decisionBadge(selectedTarget?.evaluator_decision)}
                        {selectedTarget?.hr_finalized ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                HR Finalized
                            </Badge>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedTarget(null)}
                        >
                            Close
                        </Button>
                        {selectedTarget?.evaluator_decision === 'approved' &&
                            !selectedTarget.hr_finalized && (
                                <Button
                                    disabled={processing}
                                    onClick={() =>
                                        selectedTarget &&
                                        handleFinalize(selectedTarget)
                                    }
                                >
                                    {processing ? (
                                        <>
                                            <RotateCcw className="size-4 animate-spin" />
                                            Recording…
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck2 className="size-4" />
                                            Record as Finalized
                                        </>
                                    )}
                                </Button>
                            )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
