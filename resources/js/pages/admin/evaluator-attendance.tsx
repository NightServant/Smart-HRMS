import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Database,
    Search,
    ToggleLeft,
    ToggleRight,
    UserSearch,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Attendance = {
    id: number;
    employee_name: string;
    employee_id: string;
    date: string;
    punch_time: string;
    status: string;
    source: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type Stats = {
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
};

type Subordinate = {
    employee_id: string;
    name: string;
    manual_punch_enabled: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Attendance Management',
        href: admin.evaluatorAttendance().url,
    },
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
        emerald: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        red: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
    };
    const iconColorMap: Record<string, string> = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/60 p-2 dark:bg-white/10">
                    <Icon className={`size-5 ${iconColorMap[color]}`} />
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{title}</p>
                </div>
            </div>
        </div>
    );
}

export default function EvaluatorAttendance({
    attendances,
    search,
    pagination,
    stats,
    subordinates,
}: {
    attendances: Attendance[];
    search: string;
    pagination: PaginationMeta;
    stats: Stats;
    subordinates: Subordinate[];
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [updatingEmployeeId, setUpdatingEmployeeId] = useState<string | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(subordinates[0]?.employee_id ?? '');

    const navigate = (params: { search?: string; page?: number; perPage?: number }): void => {
        router.get(admin.evaluatorAttendance({ query: params }).url, {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            only: ['attendances', 'search', 'pagination', 'stats', 'subordinates'],
        });
    };

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        navigate({ search: value, page: 1, perPage: pagination.perPage });
    };

    const handleRowsPerPageChange = (value: string): void => {
        navigate({ search: searchTerm, page: 1, perPage: Number(value) });
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) return;
        navigate({ search: searchTerm, page: pagination.currentPage - 1, perPage: pagination.perPage });
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) return;
        navigate({ search: searchTerm, page: pagination.currentPage + 1, perPage: pagination.perPage });
    };

    const updateManualPunchStatus = (employeeId: string, value: string): void => {
        const manualPunchEnabled = value === 'enabled';
        const subordinate = subordinates.find(({ employee_id }) => employee_id === employeeId);

        if (!subordinate || subordinate.manual_punch_enabled === manualPunchEnabled) {
            return;
        }

        setUpdatingEmployeeId(employeeId);
        router.patch(`/admin/evaluator-attendance/toggle-manual-punch/${employeeId}`, {
            manual_punch_enabled: manualPunchEnabled,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setUpdatingEmployeeId(null),
        });
    };

    const effectiveSelectedEmployeeId = useMemo(() => {
        if (subordinates.some(({ employee_id }) => employee_id === selectedEmployeeId)) {
            return selectedEmployeeId;
        }

        return subordinates[0]?.employee_id ?? '';
    }, [selectedEmployeeId, subordinates]);

    const selectedSubordinate = useMemo(
        () => subordinates.find(({ employee_id }) => employee_id === effectiveSelectedEmployeeId) ?? null,
        [effectiveSelectedEmployeeId, subordinates],
    );

    const handleManualPunchToggle = (): void => {
        if (!selectedSubordinate) {
            return;
        }

        updateManualPunchStatus(
            selectedSubordinate.employee_id,
            selectedSubordinate.manual_punch_enabled ? 'disabled' : 'enabled',
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance Management" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard title="Total Records" value={stats.totalRecords} icon={Database} color="blue" />
                    <StatCard title="Present" value={stats.presentCount} icon={CheckCircle2} color="emerald" />
                    <StatCard title="Late" value={stats.lateCount} icon={Clock3} color="amber" />
                    <StatCard title="Absent" value={stats.absentCount} icon={XCircle} color="red" />
                </div>

                {/* Manual Punch Settings */}
                <div className="glass-card rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                        <ToggleRight className="size-5 text-primary" />
                        Manual Punch Settings
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Select an employee, then use the toggle button to grant or remove manual attendance access for field assignments.
                    </p>
                    <div className="mb-2 rounded-xl border border-border/70 bg-background/50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="w-full max-w-sm space-y-2">
                            <p className="text-sm font-medium text-foreground">Employee</p>
                                <Select
                                    value={effectiveSelectedEmployeeId}
                                    onValueChange={setSelectedEmployeeId}
                                    disabled={subordinates.length === 0}
                                >
                                    <SelectTrigger className="w-full bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                        <span className="truncate">
                                            {selectedSubordinate ? selectedSubordinate.name : 'Select employee'}
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {subordinates.map((subordinate) => (
                                                <SelectItem
                                                    key={subordinate.employee_id}
                                                    value={subordinate.employee_id}
                                                >
                                                    {subordinate.name} ({subordinate.employee_id})
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                onClick={handleManualPunchToggle}
                                disabled={!selectedSubordinate || updatingEmployeeId === effectiveSelectedEmployeeId}
                                variant={selectedSubordinate?.manual_punch_enabled ? 'destructive' : 'default'}
                                className="w-full gap-2 sm:w-auto sm:min-w-52"
                            >
                                {selectedSubordinate?.manual_punch_enabled ? (
                                    <>
                                        <ToggleLeft className="size-4" />
                                        Disable Manual Punch
                                    </>
                                ) : (
                                    <>
                                        <ToggleRight className="size-4" />
                                        Enable Manual Punch
                                    </>
                                )}
                            </Button>
                        </div>
                        {selectedSubordinate && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">{selectedSubordinate.employee_id}</span>
                                <span className="text-border">•</span>
                                <span>
                                    Current status:{' '}
                                    <span
                                        className={
                                            selectedSubordinate.manual_punch_enabled
                                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                                : 'font-semibold text-muted-foreground'
                                        }
                                    >
                                        {selectedSubordinate.manual_punch_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Attendance Records */}
                <div className="glass-card rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="animate-slide-in-down">
                        <h1 className="flex items-center gap-2 text-xl font-bold">
                            <UserSearch className="size-6" />
                            Subordinate Attendance Records
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Attendance records for employees under your supervision.
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="bg-card pl-9"
                            />
                        </div>
                    </div>

                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                <TableHead className="px-4 py-3">Employee</TableHead>
                                <TableHead className="px-4 py-3">Date</TableHead>
                                <TableHead className="px-4 py-3">Punch Time</TableHead>
                                <TableHead className="px-4 py-3">Status</TableHead>
                                <TableHead className="px-4 py-3">Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.map((attendance, index) => (
                                <TableRow
                                    key={attendance.id}
                                    style={{ animationDelay: `${index * 24}ms` }}
                                    className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}`}
                                >
                                    <TableCell className="px-4 py-2">{attendance.employee_name}</TableCell>
                                    <TableCell className="px-4 py-2">{attendance.date}</TableCell>
                                    <TableCell className="px-4 py-2">{attendance.punch_time}</TableCell>
                                    <TableCell className="px-4 py-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            attendance.status === 'Present'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {attendance.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            attendance.source === 'biometric'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                : attendance.source === 'manual'
                                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}>
                                            {attendance.source === 'biometric' ? 'Biometric' : attendance.source === 'manual' ? 'Manual' : 'Import'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {attendances.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="bg-[#DDEFD7] px-4 py-3 text-center dark:bg-[#345A34]/80">
                                        No attendance records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                                <TableCell colSpan={5} className="px-4 py-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-2">
                                            <span>Rows per page</span>
                                            <Select value={String(pagination.perPage)} onValueChange={handleRowsPerPageChange}>
                                                <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent align="start">
                                                    <SelectGroup>
                                                        <SelectItem value="5">5</SelectItem>
                                                        <SelectItem value="10">10</SelectItem>
                                                        <SelectItem value="25">25</SelectItem>
                                                        <SelectItem value="50">50</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-4 self-end md:self-auto">
                                            <span>Page {pagination.currentPage} of {pagination.lastPage}</span>
                                            <Pagination className="mx-0 w-auto">
                                                <PaginationContent>
                                                    <PaginationItem>
                                                        <PaginationPrevious
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); goToPreviousPage(); }}
                                                            className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                        />
                                                    </PaginationItem>
                                                    <PaginationItem>
                                                        <PaginationNext
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); goToNextPage(); }}
                                                            className={pagination.currentPage === pagination.lastPage ? 'pointer-events-none opacity-50' : ''}
                                                        />
                                                    </PaginationItem>
                                                </PaginationContent>
                                            </Pagination>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
