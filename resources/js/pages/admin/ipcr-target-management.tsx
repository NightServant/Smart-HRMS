import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    FileCheck2,
    FileSpreadsheet,
    Megaphone,
    RotateCcw,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as adminIpcr from '@/routes/admin/ipcr';
import * as adminIpcrTarget from '@/routes/admin/ipcr/target';
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
    'border-b border-[#D4EBC8] bg-white transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#18291A]/40 dark:hover:bg-[#243C24]/70',
    'border-b border-[#D4EBC8] bg-[#F2FAF0] transition-colors duration-150 hover:bg-[#EBF7E5] dark:border-[#263E26] dark:bg-[#1D2E1D]/60 dark:hover:bg-[#243C24]/70',
];
const tableHeaderClass =
    'bg-[#2F5E2B] dark:bg-[#1A3D1A] hover:bg-[#2F5E2B] dark:hover:bg-[#1A3D1A] [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-white [&_th]:border-r [&_th]:border-white/10';

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
    const [selectedTarget, setSelectedTarget] = useState<IpcrTarget | null>(null);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Opening control state
    const [openSemester, setOpenSemester] = useState<string>('1');
    const [openYear, setOpenYear] = useState<string>(
        String(currentTargetPeriod.year),
    );
    const [notifying, setNotifying] = useState(false);

    const allTargets = [...submittedTargets, ...finalizedTargets];
    const uniquePeriods = Array.from(
        new Map(
            allTargets.map((t) => [
                `${t.semester}-${t.target_year}`,
                { semester: t.semester as 1 | 2, year: t.target_year },
            ]),
        ).values(),
    ).sort((a, b) => b.year - a.year || b.semester - a.semester);
    const selectedPeriod = selectedPeriodKey
        ? uniquePeriods.find((p) => `${p.semester}-${p.year}` === selectedPeriodKey) ?? null
        : null;
    const filteredSubmitted = selectedPeriod
        ? submittedTargets.filter((t) => t.semester === selectedPeriod.semester && t.target_year === selectedPeriod.year)
        : submittedTargets;
    const filteredFinalized = selectedPeriod
        ? finalizedTargets.filter((t) => t.semester === selectedPeriod.semester && t.target_year === selectedPeriod.year)
        : finalizedTargets;
    const displayRows = view === 'submitted' ? filteredSubmitted : filteredFinalized;
    function handleFinalize(target: IpcrTarget): void {
        setProcessing(true);
        router.post(
            adminIpcr.targetFinalize(target).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setSelectedTarget(null),
                onFinish: () => setProcessing(false),
            },
        );
    }

    const [closing, setClosing] = useState(false);

    function handleOpenAndNotify(): void {
        setNotifying(true);
        router.post(
            adminIpcrTarget.notify().url,
            { semester: Number(openSemester), year: Number(openYear) },
            {
                preserveScroll: true,
                onFinish: () => setNotifying(false),
            },
        );
    }

    function handleCloseWindow(): void {
        setClosing(true);
        router.post(
            adminIpcrTarget.close().url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setClosing(false),
            },
        );
    }


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Target Management" />
            <div className="app-page-shell app-page-stack pb-10">
                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader className="space-y-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                    <FileSpreadsheet className="size-3.5" />
                                    Performance Evaluation
                                </div>
                                <CardTitle className="text-2xl">
                                    HR IPCR Targets
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-sm leading-6">
                                    Manage target form access, enable or
                                    disable the employee target form, and keep
                                    the target workflow visually aligned with
                                    the HR queue.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Period: {currentTargetPeriod.label}
                                </Badge>
                                <Badge variant="outline">
                                    {currentTargetPeriod.submissionOpen
                                        ? 'Target Cycle Open'
                                        : 'Target Cycle Closed'}
                                </Badge>
                                <Badge variant="outline">
                                    View:{' '}
                                    {view === 'submitted'
                                        ? 'Submitted Targets'
                                        : 'Finalized Targets'}
                                </Badge>
                            </div>
                        </div>

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
                    </CardHeader>
                </Card>

                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-2">
                                <Megaphone className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                                <CardTitle className="text-lg">
                                    Target Form Access
                                </CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentTargetPeriod.submissionOpen ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                        Window Open — {currentTargetPeriod.label}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">
                                        Window Closed
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <CardDescription>
                            Select the semester and year, then enable or
                            disable the target form for employees. When you
                            enable it, the system notifies employees to start
                            their IPCR targets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
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
                                <Label htmlFor="target-year">Year</Label>
                                <Input
                                    id="target-year"
                                    type="text"
                                    value={openYear}
                                    onChange={(e) => setOpenYear(e.target.value)}
                                    placeholder="e.g. 2026"
                                    className="border-border bg-background"
                                />
                            </div>

                            <div className="flex items-center gap-3 pb-0.5">
                                <Switch
                                    id="target-form-toggle"
                                    checked={currentTargetPeriod.submissionOpen}
                                    onCheckedChange={(checked) =>
                                        checked ? handleOpenAndNotify() : handleCloseWindow()
                                    }
                                    disabled={notifying || closing || !openYear.trim()}
                                />
                                <Label htmlFor="target-form-toggle" className="cursor-pointer select-none">
                                    {(notifying || closing)
                                        ? 'Saving…'
                                        : currentTargetPeriod.submissionOpen
                                          ? 'Enabled'
                                          : 'Disabled'}
                                </Label>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Period Table */}
                <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle>Target Periods</CardTitle>
                        <CardDescription className="mt-1">
                            Select a period to view submitted and finalized targets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={tableHeaderClass}>
                                        <th>Semester</th>
                                        <th>Year</th>
                                        <th>Submitted</th>
                                        <th>Finalized</th>
                                        <th className="!text-center">View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniquePeriods.map((period, index) => {
                                        const key = `${period.semester}-${period.year}`;
                                        const submittedCount = submittedTargets.filter(
                                            (t) => t.semester === period.semester && t.target_year === period.year,
                                        ).length;
                                        const finalizedCount = finalizedTargets.filter(
                                            (t) => t.semester === period.semester && t.target_year === period.year,
                                        ).length;
                                        return (
                                            <tr key={key} className={stripedRows[index % 2]}>
                                                <td className="px-5 py-3.5">
                                                    {period.semester === 1 ? 'First Semester' : 'Second Semester'}
                                                </td>
                                                <td className="px-5 py-3.5">{period.year}</td>
                                                <td className="px-5 py-3.5">{submittedCount}</td>
                                                <td className="px-5 py-3.5">{finalizedCount}</td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedPeriodKey(key)}
                                                    >
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {uniquePeriods.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                            >
                                                No target records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Period Detail Dialog */}
            <Dialog
                open={selectedPeriodKey !== null}
                onOpenChange={(open) => !open && setSelectedPeriodKey(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPeriod
                                ? semesterLabel(selectedPeriod.semester, selectedPeriod.year)
                                : 'Targets'}
                        </DialogTitle>
                        <DialogDescription>
                            Review submitted and finalized IPCR targets for this period.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 py-1">
                        <Button
                            type="button"
                            variant={view === 'submitted' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView('submitted')}
                        >
                            <FileSpreadsheet className="size-4" />
                            Submitted ({filteredSubmitted.length})
                        </Button>
                        <Button
                            type="button"
                            variant={view === 'finalized' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView('finalized')}
                        >
                            <FileCheck2 className="size-4" />
                            Finalized ({filteredFinalized.length})
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={tableHeaderClass}>
                                    <th>Employee</th>
                                    <th>Submitted</th>
                                    <th>Evaluator Decision</th>
                                    <th>HR Status</th>
                                    <th className="!text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.map((target, index) => (
                                    <tr key={target.id} className={stripedRows[index % 2]}>
                                        <td className="px-5 py-3.5 font-medium">
                                            {target.employee?.name ?? target.employee_id}
                                        </td>
                                        <td className="px-5 py-3.5 text-muted-foreground">
                                            {target.submitted_at
                                                ? new Date(target.submitted_at).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {decisionBadge(target.evaluator_decision)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {target.hr_finalized ? (
                                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                                    Finalized
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Not Recorded</Badge>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedTarget(target)}
                                            >
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {displayRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="bg-white px-5 py-10 text-center text-muted-foreground dark:bg-[#18291A]/40"
                                        >
                                            No {view === 'submitted' ? 'submitted' : 'finalized'} IPCR targets for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPeriodKey(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
