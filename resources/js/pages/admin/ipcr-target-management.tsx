import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CheckCircle2,
    Clock3,
    ChevronDown,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import AppLayout from '@/layouts/app-layout';
import * as adminIpcr from '@/routes/admin/ipcr';
import * as adminIpcrTarget from '@/routes/admin/ipcr/target';
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
    const [targetFormAction, setTargetFormAction] = useState<'enable' | 'disable'>(
        currentTargetPeriod.submissionOpen ? 'disable' : 'enable',
    );

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

    const displayRows = view === 'submitted' ? submittedTargets : finalizedTargets;
    const targetFormActionLabel = targetFormAction === 'enable'
        ? 'Enable Target Form'
        : 'Disable Target Form';
    const targetFormActionDescription = targetFormAction === 'enable'
        ? 'Enable the target form and notify employees to start their IPCR targets.'
        : 'Disable the target form and stop employees from submitting new targets.';
    const targetFormModeLabel = targetFormAction === 'enable'
        ? 'Enable'
        : 'Disable';

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

    function handleTargetFormAction(): void {
        if (targetFormAction === 'enable') {
            handleOpenAndNotify();
            return;
        }

        handleCloseWindow();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Target Management" />
            <div className="app-page-shell app-page-stack pb-10">
                <Card className="glass-card border-border bg-card shadow-sm">
                    <CardHeader className="space-y-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
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

                            <div className="flex items-end gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-between sm:w-48"
                                            disabled={notifying || closing}
                                            title={targetFormActionDescription}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Bell className="size-4" />
                                                {targetFormModeLabel}
                                            </span>
                                            <ChevronDown className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-64"
                                    >
                                        <DropdownMenuItem
                                            onClick={() => setTargetFormAction('enable')}
                                        >
                                            <Bell className="size-4" />
                                            Enable Target Form
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setTargetFormAction('disable')}
                                        >
                                            <XCircle className="size-4" />
                                            Disable Target Form
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto"
                                    disabled={notifying || closing}
                                    onClick={handleTargetFormAction}
                                >
                                    {targetFormAction === 'enable' ? (
                                        <>
                                            <Send className="size-4" />
                                            {notifying
                                                ? 'Enabling…'
                                                : targetFormActionLabel}
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="size-4" />
                                            {closing
                                                ? 'Disabling…'
                                                : targetFormActionLabel}
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
