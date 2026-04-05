import { router } from '@inertiajs/react';
import { Eye, Search, UserSearch } from 'lucide-react';
import { useState } from 'react';
import { LeaveDetailDialog } from '@/components/leave-detail-dialog';
import type { LeaveRequestDetail } from '@/components/leave-detail-dialog';
import PageIntro from '@/components/page-intro';
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import * as admin from '@/routes/admin';

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { label: string; className: string }> = {
        completed: {
            label: 'Approved',
            className:
                'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800',
        },
        returned: {
            label: 'Rejected',
            className:
                'bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800',
        },
        routed: {
            label: 'In Review',
            className:
                'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800',
        },
        pending: {
            label: 'Pending',
            className:
                'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800',
        },
    };

    const { label, className } = variants[status] ?? variants.pending;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
        >
            {label}
        </span>
    );
}

function DhDecisionBadge({ decision }: { decision: number }) {
    if (decision === 1) {
        return (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800">
                Approved
            </span>
        );
    }
    if (decision === 2) {
        return (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 ring-inset dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800">
                Returned
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800">
            Pending
        </span>
    );
}

function formatLeaveType(type: string): string {
    return type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStageLabel(stage: string): string {
    const labels: Record<string, string> = {
        sent_to_department_head: 'Evaluator Review',
        sent_to_hr: 'HR Review',
        completed: 'Completed',
    };

    return labels[stage] ?? formatLeaveType(stage);
}

function formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        completed: 'Approved',
        returned: 'Rejected',
        routed: 'In Review',
        pending: 'Pending',
    };

    return labels[status] ?? formatLeaveType(status);
}

function formatLeaveAccrual(value: number | null): string {
    return value != null ? value.toFixed(2) : '—';
}

export default function HrLeaveManagementTable({
    leaveRequests,
    search,
    leaveTypeFilter = '',
    statusFilter = '',
    stageFilter = '',
    leaveTypeOptions = [],
    statusOptions = [],
    stageOptions = [],
    pagination,
}: {
    leaveRequests: LeaveRequestDetail[];
    search: string;
    leaveTypeFilter?: string;
    statusFilter?: string;
    stageFilter?: string;
    leaveTypeOptions?: string[];
    statusOptions?: string[];
    stageOptions?: string[];
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [currentLeaveTypeFilter, setCurrentLeaveTypeFilter] =
        useState(leaveTypeFilter);
    const [currentStatusFilter, setCurrentStatusFilter] =
        useState(statusFilter);
    const [currentStageFilter, setCurrentStageFilter] = useState(stageFilter);
    const [selectedLeave, setSelectedLeave] =
        useState<LeaveRequestDetail | null>(null);

    const visit = (params: {
        search?: string;
        page?: number;
        perPage?: number;
        leaveTypeFilter?: string;
        statusFilter?: string;
        stageFilter?: string;
    }): void => {
        router.get(
            admin.hrLeaveManagement().url,
            {
                search: params.search ?? searchTerm,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
                leaveTypeFilter:
                    params.leaveTypeFilter ?? currentLeaveTypeFilter,
                statusFilter: params.statusFilter ?? currentStatusFilter,
                stageFilter: params.stageFilter ?? currentStageFilter,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: [
                    'leaveRequests',
                    'search',
                    'leaveTypeFilter',
                    'statusFilter',
                    'stageFilter',
                    'leaveTypeOptions',
                    'statusOptions',
                    'stageOptions',
                    'pagination',
                ],
            },
        );
    };

    const handleLeaveTypeFilterChange = (value: string): void => {
        const filterValue = value === 'all' ? '' : value;
        setCurrentLeaveTypeFilter(filterValue);
        visit({ leaveTypeFilter: filterValue, page: 1 });
    };

    const handleStatusFilterChange = (value: string): void => {
        const filterValue = value === 'all' ? '' : value;
        setCurrentStatusFilter(filterValue);
        visit({ statusFilter: filterValue, page: 1 });
    };

    const handleStageFilterChange = (value: string): void => {
        const filterValue = value === 'all' ? '' : value;
        setCurrentStageFilter(filterValue);
        visit({ stageFilter: filterValue, page: 1 });
    };

    return (
        <>
            <PageIntro
                eyebrow="HR Personnel · Leave Management"
                title="HR Leave Management"
                description="Review and process leave requests forwarded by the Department Head."
                className="animate-slide-in-down"
                actions={
                    <span className="app-info-pill">
                        <UserSearch className="size-4 text-primary" />
                        {pagination.total} requests
                    </span>
                }
            />

            <div className="glass-card app-data-shell mx-auto w-full animate-zoom-in-soft bg-card shadow-sm">
                <div className="app-filter-bar py-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                visit({ search: e.target.value, page: 1 });
                            }}
                            placeholder="Search by name, leave type, or status…"
                            className="bg-card pl-9"
                        />
                    </div>
                    <div className="app-filter-bar__actions overflow-x-auto pb-1">
                        <Select
                            value={currentLeaveTypeFilter || 'all'}
                            onValueChange={handleLeaveTypeFilterChange}
                        >
                            <SelectTrigger className="w-48 shrink-0 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                <SelectValue placeholder="All leave types" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectGroup>
                                    <SelectItem value="all">
                                        All leave types
                                    </SelectItem>
                                    {leaveTypeOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {formatLeaveType(option)}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select
                            value={currentStatusFilter || 'all'}
                            onValueChange={handleStatusFilterChange}
                        >
                            <SelectTrigger className="w-44 shrink-0 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectGroup>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {formatStatusLabel(option)}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select
                            value={currentStageFilter || 'all'}
                            onValueChange={handleStageFilterChange}
                        >
                            <SelectTrigger className="w-48 shrink-0 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                <SelectValue placeholder="All routing stages" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectGroup>
                                    <SelectItem value="all">
                                        All routing stages
                                    </SelectItem>
                                    {stageOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {formatStageLabel(option)}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Table className="w-full min-w-[72rem]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-center">Days</TableHead>
                            <TableHead className="text-center">
                                DH Decision
                            </TableHead>
                            <TableHead className="text-center">
                                Status
                            </TableHead>
                            <TableHead className="text-center">
                                Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaveRequests.map((lr, index) => (
                            <TableRow
                                key={lr.id}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-medium text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {lr.name}
                                        </span>
                                        {lr.employeeId && (
                                            <span className="text-xs text-muted-foreground">
                                                {lr.employeeId}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-semibold">
                                    {formatLeaveType(lr.leaveType)}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span>{lr.startDate}</span>
                                    <span className="mx-1 text-muted-foreground">
                                        –
                                    </span>
                                    <span>{lr.endDate}</span>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                    {formatLeaveAccrual(lr.leaveAccrual)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <DhDecisionBadge decision={lr.dhDecision} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge status={lr.status} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5 border-[#2F5E2B]/30 bg-white/60 text-[#2F5E2B] hover:bg-[#2F5E2B] hover:text-white dark:border-[#4A7C3C]/50 dark:bg-transparent dark:text-[#7DC46B] dark:hover:bg-[#2F5E2B] dark:hover:text-white"
                                        onClick={() => setSelectedLeave(lr)}
                                    >
                                        <Eye className="size-3.5" />
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {leaveRequests.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="app-table-empty px-4 py-8"
                                >
                                    No leave requests awaiting HR review.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="app-table-pagination-bar">
                <div className="app-table-pagination-shell">
                    <div className="app-table-pagination-page-size">
                        <span className="text-sm">
                            Rows per page
                        </span>
                        <Select
                            value={String(pagination.perPage)}
                            onValueChange={(v) =>
                                visit({
                                    perPage: Number(v),
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                                <SelectGroup>
                                    {[
                                        '5',
                                        '10',
                                        '25',
                                        '50',
                                    ].map((v) => (
                                        <SelectItem
                                            key={v}
                                            value={v}
                                        >
                                            {v}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="app-table-pagination-controls">
                        <span className="app-table-pagination-status">
                            Page {pagination.currentPage} of{' '}
                            {pagination.lastPage}
                        </span>
                        <Pagination className="app-table-pagination-nav">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (
                                                pagination.currentPage >
                                                1
                                            ) {
                                                visit({
                                                    page:
                                                        pagination.currentPage -
                                                        1,
                                                });
                                            }
                                        }}
                                        className={
                                            pagination.currentPage ===
                                            1
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                        }
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (
                                                pagination.currentPage <
                                                pagination.lastPage
                                            ) {
                                                visit({
                                                    page:
                                                        pagination.currentPage +
                                                        1,
                                                });
                                            }
                                        }}
                                        className={
                                            pagination.currentPage ===
                                            pagination.lastPage
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </div>

            {/* Leave detail dialog */}
            <LeaveDetailDialog
                leave={selectedLeave}
                role="hr"
                onClose={() => setSelectedLeave(null)}
            />
        </>
    );
}
