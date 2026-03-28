import { router } from '@inertiajs/react';
import { Search, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as admin from '@/routes/admin';

type ActivityLog = {
    id: number;
    createdAt: string | null;
    userName: string;
    userId: number | null;
    actionType: string;
    description: string;
    ipAddress: string | null;
};

type Filters = {
    search: string;
    actionType: string;
    dateFrom: string;
    dateTo: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

function actionTypeBadgeClassName(actionType: string): string {
    if (actionType === 'login' || actionType === 'logout') {
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    }
    if (actionType.startsWith('user.')) {
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (actionType.startsWith('leave.') || actionType.startsWith('ipcr.')) {
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    }
    if (actionType.startsWith('data.') || actionType.startsWith('password.')) {
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
}

export function AdminActivityLogsTable({
    logs,
    filters,
    actionTypes,
    pagination,
}: {
    logs: ActivityLog[];
    filters: Filters;
    actionTypes: string[];
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [actionType, setActionType] = useState(filters.actionType || 'all');
    const [dateFrom, setDateFrom] = useState(filters.dateFrom);
    const [dateTo, setDateTo] = useState(filters.dateTo);

    const visit = (params: Partial<Filters> & { page?: number; perPage?: number }): void => {
        router.get(
            admin.activityLogs().url,
            {
                search: params.search ?? searchTerm,
                actionType: (params.actionType ?? actionType) === 'all' ? '' : params.actionType ?? actionType,
                dateFrom: params.dateFrom ?? dateFrom,
                dateTo: params.dateTo ?? dateTo,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['logs', 'filters', 'pagination', 'summary', 'actionTypes'],
            },
        );
    };

    return (
        <div className="glass-card animate-zoom-in-soft mx-auto w-full rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-4 py-6 xl:grid-cols-[minmax(0,1fr)_13rem_11rem_11rem]">
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            visit({ search: event.target.value, page: 1 });
                        }}
                        className="pl-9"
                        placeholder="Search user or description..."
                    />
                </div>
                <Select value={actionType} onValueChange={(value) => {
                    setActionType(value);
                    visit({ actionType: value, page: 1 });
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Action type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All actions</SelectItem>
                            {actionTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(event) => {
                    setDateFrom(event.target.value);
                    visit({ dateFrom: event.target.value, page: 1 });
                }} />
                <Input type="date" value={dateTo} onChange={(event) => {
                    setDateTo(event.target.value);
                    visit({ dateTo: event.target.value, page: 1 });
                }} />
            </div>

            <Table className="w-full">
                <TableHeader>
                    <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>IP Address</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log, index) => (
                        <TableRow
                            key={log.id}
                            style={{ animationDelay: `${index * 24}ms` }}
                            className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}`}
                        >
                            <TableCell>{log.createdAt ?? '-'}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{log.userName}</span>
                                    {log.userId !== null && (
                                        <span className="text-xs font-normal text-muted-foreground">ID: {log.userId}</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="secondary"
                                    className={`text-xs font-semibold ${actionTypeBadgeClassName(log.actionType)}`}
                                >
                                    {log.actionType}
                                </Badge>
                            </TableCell>
                            <TableCell>{log.description}</TableCell>
                            <TableCell className="font-mono text-xs">{log.ipAddress ?? '-'}</TableCell>
                        </TableRow>
                    ))}
                    {logs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80">
                                No activity log records found for the selected filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                        <TableCell colSpan={5}>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <span>Rows per page</span>
                                    <Select value={String(pagination.perPage)} onValueChange={(value) => visit({ perPage: Number(value), page: 1 })}>
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
                                    <span>
                                        Page {pagination.currentPage} of {pagination.lastPage}
                                    </span>
                                    <Pagination className="mx-0 w-auto">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (pagination.currentPage > 1) {
                                                            visit({ page: pagination.currentPage - 1 });
                                                        }
                                                    }}
                                                    className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (pagination.currentPage < pagination.lastPage) {
                                                            visit({ page: pagination.currentPage + 1 });
                                                        }
                                                    }}
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

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <TimerReset className="size-4" />
                Activity log entries are read-only and reflect user actions across the system.
            </div>
        </div>
    );
}
