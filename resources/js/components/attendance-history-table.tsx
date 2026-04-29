import {
    Calendar as CalendarIcon,
    Clock,
    Filter,
    Search,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export type DailyAttendanceRecord = {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'on_time' | 'late' | 'incomplete';
    late_minutes: number;
    source: string;
};

const STATUS_LABELS: Record<DailyAttendanceRecord['status'], string> = {
    on_time: 'On Time',
    late: 'Late',
    incomplete: 'Incomplete',
};

const STATUS_CLASSES: Record<DailyAttendanceRecord['status'], string> = {
    on_time:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    incomplete:
        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300',
};

const MONTH_LABELS: Record<string, string> = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ALL = 'all';

function formatSource(source: string): string {
    return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AttendanceHistoryTable({
    records,
}: {
    records: DailyAttendanceRecord[];
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [yearFilter, setYearFilter] = useState<string>(ALL);
    const [monthFilter, setMonthFilter] = useState<string>(ALL);
    const [dateFilter, setDateFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>(ALL);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const filterKey = `${searchQuery}|${yearFilter}|${monthFilter}|${dateFilter}|${statusFilter}|${pageSize}`;
    const [lastFilterKey, setLastFilterKey] = useState(filterKey);

    if (filterKey !== lastFilterKey) {
        setLastFilterKey(filterKey);
        setPage(1);
    }

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        records.forEach((record) => {
            const year = record.date?.slice(0, 4);
            if (year) {
                years.add(year);
            }
        });
        return Array.from(years).sort((left, right) =>
            right.localeCompare(left),
        );
    }, [records]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        records.forEach((record) => {
            if (yearFilter !== ALL && !record.date.startsWith(yearFilter)) {
                return;
            }
            const month = record.date?.slice(5, 7);
            if (month) {
                months.add(month);
            }
        });
        return Array.from(months).sort();
    }, [records, yearFilter]);

    const filtered = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return records.filter((record) => {
            if (yearFilter !== ALL && !record.date.startsWith(yearFilter)) {
                return false;
            }

            if (monthFilter !== ALL) {
                const month = record.date.slice(5, 7);
                if (month !== monthFilter) {
                    return false;
                }
            }

            if (dateFilter && record.date !== dateFilter) {
                return false;
            }

            if (statusFilter !== ALL && record.status !== statusFilter) {
                return false;
            }

            if (normalizedQuery !== '') {
                const haystack = [
                    record.date,
                    record.time_in ?? '',
                    record.time_out ?? '',
                    STATUS_LABELS[record.status],
                    record.source,
                    String(record.late_minutes),
                ]
                    .join(' ')
                    .toLowerCase();

                if (!haystack.includes(normalizedQuery)) {
                    return false;
                }
            }

            return true;
        });
    }, [records, yearFilter, monthFilter, dateFilter, statusFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);

    const paginated = useMemo(() => {
        const start = (safePage - 1) * pageSize;

        return filtered.slice(start, start + pageSize);
    }, [filtered, safePage, pageSize]);

    const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const rangeEnd = Math.min(filtered.length, safePage * pageSize);

    const hasActiveFilter =
        searchQuery !== '' ||
        yearFilter !== ALL ||
        monthFilter !== ALL ||
        dateFilter !== '' ||
        statusFilter !== ALL;

    const resetFilters = (): void => {
        setSearchQuery('');
        setYearFilter(ALL);
        setMonthFilter(ALL);
        setDateFilter('');
        setStatusFilter(ALL);
    };

    return (
        <div className="glass-card app-data-shell mx-auto w-full animate-zoom-in-soft overflow-hidden bg-card shadow-sm">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        <Clock className="size-5" />
                        Recent Attendance
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Daily attendance summary based on biometric and manual
                        punches.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-background/70">
                        <Filter className="size-3.5" />
                        {filtered.length} of {records.length} record
                        {records.length === 1 ? '' : 's'}
                    </Badge>
                    {hasActiveFilter ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs"
                            onClick={resetFilters}
                        >
                            <X className="size-3.5" />
                            Reset filters
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-12">
                <div className="md:col-span-4">
                    <label
                        htmlFor="attendance-search"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >
                        Search
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="attendance-search"
                            type="search"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search by date, time, status, or source"
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label
                        htmlFor="attendance-year"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >
                        Year
                    </label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger id="attendance-year">
                            <SelectValue placeholder="All years" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All years</SelectItem>
                            {availableYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-2">
                    <label
                        htmlFor="attendance-month"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >
                        Month
                    </label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger id="attendance-month">
                            <SelectValue placeholder="All months" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All months</SelectItem>
                            {availableMonths.map((month) => (
                                <SelectItem key={month} value={month}>
                                    {MONTH_LABELS[month] ?? month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-2">
                    <label
                        htmlFor="attendance-status"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >
                        Status
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="attendance-status">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            <SelectItem value="on_time">On Time</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="incomplete">
                                Incomplete
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-2">
                    <label
                        htmlFor="attendance-date"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
                    >
                        Specific Date
                    </label>
                    <div className="relative">
                        <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="attendance-date"
                            type="date"
                            value={dateFilter}
                            onChange={(event) =>
                                setDateFilter(event.target.value)
                            }
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            <Separator className="mb-0" />

            <div className="overflow-x-auto">
                <Table className="w-full min-w-[44rem]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
                            <TableHead>Date</TableHead>
                            <TableHead>Time In</TableHead>
                            <TableHead>Time Out</TableHead>
                            <TableHead>Late (min)</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((record, index) => (
                            <TableRow
                                key={record.id}
                                style={{
                                    animationDelay: `${index * 12}ms`,
                                }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${
                                    index % 2 === 0
                                        ? 'app-table-row-even'
                                        : 'app-table-row-odd'
                                }`}
                            >
                                <TableCell className="font-mono">
                                    {record.date}
                                </TableCell>
                                <TableCell className="font-mono">
                                    {record.time_in ?? '—'}
                                </TableCell>
                                <TableCell className="font-mono">
                                    {record.time_out ?? '—'}
                                </TableCell>
                                <TableCell>
                                    {record.late_minutes > 0
                                        ? record.late_minutes
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatSource(record.source)}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[record.status]}`}
                                    >
                                        {STATUS_LABELS[record.status]}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginated.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="app-table-empty px-4 py-10 text-center text-sm text-muted-foreground"
                                >
                                    {hasActiveFilter
                                        ? 'No records match the current filters.'
                                        : 'No attendance records found.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                        Showing {rangeStart}–{rangeEnd} of {filtered.length}
                    </span>
                    <Separator orientation="vertical" className="hidden h-4 sm:block" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Rows per page</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) =>
                                setPageSize(Number(value))
                            }
                        >
                            <SelectTrigger className="h-8 w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Pagination className="w-auto justify-end">
                    <PaginationContent className="gap-2">
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(event) => {
                                    event.preventDefault();
                                    if (safePage > 1) {
                                        setPage(safePage - 1);
                                    }
                                }}
                                className={
                                    safePage === 1
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <span className="inline-flex h-9 min-w-[6rem] items-center justify-center rounded-md border border-border/70 bg-card px-3 text-xs font-medium text-foreground">
                                Page {safePage} of {totalPages}
                            </span>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(event) => {
                                    event.preventDefault();
                                    if (safePage < totalPages) {
                                        setPage(safePage + 1);
                                    }
                                }}
                                className={
                                    safePage === totalPages
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
