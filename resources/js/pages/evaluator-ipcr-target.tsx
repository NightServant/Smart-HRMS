import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Target,
    Users,
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
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as ipcrTargetRoutes from '@/routes/ipcr/target';
import type { BreadcrumbItem } from '@/types';
import type { IpcrTarget, IpcrTargetPeriod } from '@/types/ipcr';

type EmployeeRow = {
    employee_id: string;
    name: string;
    job_title: string;
    target: IpcrTarget | null;
};

type Stats = {
    total: number;
    notSet: number;
    pending: number;
    approved: number;
    rejected: number;
};

type PageProps = {
    targetPeriod: IpcrTargetPeriod;
    employees: EmployeeRow[];
    stats: Stats;
};

type StatusFilter = 'all' | 'not_set' | 'pending' | 'approved' | 'returned';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Performance Evaluation', href: '/evaluator/ipcr-target' },
    { title: 'IPCR Target', href: '/evaluator/ipcr-target' },
];

function semesterLabel(semester: 1 | 2, year: number): string {
    return semester === 1
        ? `First Semester (January–June) ${year}`
        : `Second Semester (July–December) ${year}`;
}

function targetStatusBadge(target: IpcrTarget | null): React.ReactNode {
    if (!target) {
        return <Badge variant="outline">Not Set</Badge>;
    }

    if (target.evaluator_decision === 'approved') {
        return (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Approved
            </Badge>
        );
    }

    if (target.evaluator_decision === 'rejected') {
        return (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                Returned
            </Badge>
        );
    }

    if (target.status === 'submitted') {
        return (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Pending Review
            </Badge>
        );
    }

    return <Badge variant="outline">Draft</Badge>;
}

function rowMatchesFilter(row: EmployeeRow, filter: StatusFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'not_set') return !row.target;
    if (filter === 'pending') return !!row.target && row.target.status === 'submitted' && !row.target.evaluator_decision;
    if (filter === 'approved') return row.target?.evaluator_decision === 'approved';
    if (filter === 'returned') return row.target?.evaluator_decision === 'rejected';
    return true;
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
    color: 'default' | 'amber' | 'emerald' | 'red';
}) {
    const colorMap = {
        default: 'border-border bg-card',
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        emerald:
            'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        red: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
    };
    const iconColorMap = {
        default: 'text-foreground',
        amber: 'text-amber-600 dark:text-amber-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        red: 'text-red-600 dark:text-red-400',
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

export default function EvaluatorIpcrTarget() {
    const { targetPeriod, employees, stats } = usePage<PageProps>().props;

    const [showList, setShowList] = useState(false);
    const [selected, setSelected] = useState<EmployeeRow | null>(null);
    const [decision, setDecision] = useState<'approved' | 'rejected' | ''>('');
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const filteredEmployees = employees.filter((row) => rowMatchesFilter(row, statusFilter));

    function openReview(row: EmployeeRow): void {
        setSelected(row);
        setDecision('');
        setRemarks('');
    }

    function handleSubmit(): void {
        if (!selected?.target || !decision) return;

        setProcessing(true);
        router.post(
            ipcrTargetRoutes.evaluatorReview(selected.target.id).url,
            { decision, remarks: decision === 'rejected' ? remarks : null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelected(null);
                    setDecision('');
                    setRemarks('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    const canReview = (row: EmployeeRow) =>
        row.target?.status === 'submitted' &&
        !row.target?.evaluator_decision;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IPCR Target" />
            <div className="app-page-shell app-page-stack pb-10">
                <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                    <CardHeader className="gap-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-2xl">
                                    Evaluator IPCR Targets
                                </CardTitle>
                                <CardDescription className="max-w-3xl text-sm leading-6">
                                    Review employee targets in a separate queue
                                    before you evaluate the matching IPCR
                                    submission. The routing stays aligned with
                                    the submission workflow while target review
                                    remains on its own page.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Period:{' '}
                                    {semesterLabel(
                                        targetPeriod.semester,
                                        targetPeriod.year,
                                    )}
                                </Badge>
                                <Badge variant="outline">
                                    {targetPeriod.submissionOpen
                                        ? 'Target Cycle Active'
                                        : 'Target Cycle Closed'}
                                </Badge>
                                <Badge variant="outline">
                                    Pending Review: {stats.pending}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <StatCard
                                label="Total Employees"
                                value={stats.total}
                                icon={Users}
                                color="default"
                            />
                            <StatCard
                                label="Not Set"
                                value={stats.notSet}
                                icon={Target}
                                color="default"
                            />
                            <StatCard
                                label="Pending Your Review"
                                value={stats.pending}
                                icon={Clock3}
                                color="amber"
                            />
                            <StatCard
                                label="Approved"
                                value={stats.approved}
                                icon={CheckCircle2}
                                color="emerald"
                            />
                            <StatCard
                                label="Returned"
                                value={stats.rejected}
                                icon={XCircle}
                                color="red"
                            />
                        </div>
                    </CardHeader>
                </Card>

                <Card className="glass-card overflow-hidden border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border bg-card">
                        <CardTitle>Target Periods</CardTitle>
                        <CardDescription className="mt-1">
                            Select a period to view employee targets and submit your evaluator review.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:border-r [&_th]:border-white/10 [&_th]:text-white">
                                        <TableHead>Semester</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>Pending</TableHead>
                                        <TableHead className="text-center">View</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-[#DDEFD7] dark:bg-[#345A34]/80">
                                        <TableCell>
                                            {targetPeriod.semester === 1 ? 'First Semester' : 'Second Semester'}
                                        </TableCell>
                                        <TableCell>{targetPeriod.year}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                {stats.pending} pending
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button size="sm" onClick={() => setShowList(true)}>
                                                View Employees
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee List Dialog */}
            <Dialog open={showList} onOpenChange={setShowList}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>Employee IPCR Targets</DialogTitle>
                        <DialogDescription>
                            {semesterLabel(targetPeriod.semester, targetPeriod.year)} — review and approve or return employee targets.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 py-1">
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="not_set">Not Set</SelectItem>
                                <SelectItem value="pending">Pending Review</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="returned">Returned</SelectItem>
                            </SelectContent>
                        </Select>
                        <Badge variant="outline" className="shrink-0">
                            {filteredEmployees.length} Employee
                            {filteredEmployees.length === 1 ? '' : 's'}
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:border-r [&_th]:border-white/10 [&_th]:text-white">
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Target Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-center">View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((row, index) => (
                                    <TableRow
                                        key={row.employee_id}
                                        className={index % 2 === 0
                                            ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80'
                                            : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}
                                    >
                                        <TableCell>{row.employee_id}</TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{row.job_title}</TableCell>
                                        <TableCell>{targetStatusBadge(row.target)}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {row.target?.submitted_at
                                                ? new Date(row.target.submitted_at).toLocaleDateString()
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {canReview(row) ? (
                                                <Button size="sm" onClick={() => openReview(row)}>
                                                    Review
                                                </Button>
                                            ) : row.target ? (
                                                <Button size="sm" variant="outline" onClick={() => openReview(row)}>
                                                    View
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="bg-[#DDEFD7] py-10 text-center text-muted-foreground dark:bg-[#345A34]/80"
                                        >
                                            {employees.length === 0
                                                ? 'No employees are assigned to you as supervisor.'
                                                : 'No employees match the selected filter.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowList(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review / View Dialog */}
            <Dialog
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,80rem)] xl:max-w-[min(96vw,90rem)]">
                    <DialogHeader>
                        <DialogTitle>
                            {canReview(selected ?? { target: null } as EmployeeRow)
                                ? 'Review IPCR Target'
                                : 'IPCR Target Snapshot'}
                        </DialogTitle>
                        <DialogDescription>
                            {selected?.name} —{' '}
                            {semesterLabel(
                                targetPeriod.semester,
                                targetPeriod.year,
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selected?.target?.form_payload && (
                        <IpcrTargetReadonly
                            target={selected.target}
                            title="Employee Targets"
                            description="Review the performance targets submitted by the employee for this semester."
                        />
                    )}

                    {/* Previous decision display */}
                    {selected?.target?.evaluator_decision && (
                        <div className="glass-card rounded-[26px] border border-border bg-card p-4 shadow-sm">
                            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                Your Decision
                            </p>
                            <p className="mt-1 font-medium capitalize">
                                {selected.target.evaluator_decision}
                            </p>
                            {selected.target.evaluator_remarks && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {selected.target.evaluator_remarks}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Approve / Reject controls (only when pending) */}
                    {selected && canReview(selected) && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    variant={decision === 'approved' ? 'default' : 'outline'}
                                    className={decision === 'approved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                                    onClick={() => setDecision('approved')}
                                >
                                    <CheckCircle2 className="mr-1.5 size-4" />
                                    Approve Targets
                                </Button>
                                <Button
                                    type="button"
                                    variant={decision === 'rejected' ? 'destructive' : 'outline'}
                                    onClick={() => setDecision('rejected')}
                                >
                                    <XCircle className="mr-1.5 size-4" />
                                    Return to Employee
                                </Button>
                            </div>

                            {decision === 'rejected' && (
                                <div className="space-y-2">
                                    <Label>
                                        Remarks{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Explain what the employee needs to revise."
                                        className="min-h-24"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelected(null)}>
                            Close
                        </Button>
                        {selected && canReview(selected) && (
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
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
