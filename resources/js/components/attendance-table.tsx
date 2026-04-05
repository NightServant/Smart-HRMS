import { router, usePage } from '@inertiajs/react';
import { Search, UserSearch, Download, Upload, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
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
import type { Auth } from '@/types';

type Attendance = {
    id: number;
    employee_name: string;
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

export function AttendanceTable({
    attendances,
    search,
    pagination,
}: {
    attendances: Attendance[];
    search: string;
    pagination: PaginationMeta;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [searchTerm, setSearchTerm] = useState(search);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canManageAttendance = auth.user.role === 'hr-personnel';

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        router.get(
            admin.attendanceManagement().url,
            { search: value, page: 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['attendances', 'search', 'pagination'],
            },
        );
    };

    const handleRowsPerPageChange = (value: string): void => {
        router.get(
            admin.attendanceManagement().url,
            { search: searchTerm, page: 1, perPage: Number(value) },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['attendances', 'search', 'pagination'],
            },
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) return;
        router.get(
            admin.attendanceManagement().url,
            {
                search: searchTerm,
                page: pagination.currentPage - 1,
                perPage: pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['attendances', 'search', 'pagination'],
            },
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) return;
        router.get(
            admin.attendanceManagement().url,
            {
                search: searchTerm,
                page: pagination.currentPage + 1,
                perPage: pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['attendances', 'search', 'pagination'],
            },
        );
    };

    const handleExportClick = (): void => {
        const searchParam = encodeURIComponent(searchTerm);
        window.location.href = `/admin/attendance-management/export-csv?search=${searchParam}`;
    };

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        const file = event.target.files?.[0];
        if (!file) return;

        router.post(
            '/admin/attendance-management/import-csv',
            { file },
            {
                forceFormData: true,
                onStart: () => setIsImporting(true),
                onFinish: () => setIsImporting(false),
            },
        );

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearImport = (): void => {
        if (
            !confirm(
                'Are you sure you want to clear all attendance records? This action cannot be undone.',
            )
        ) {
            return;
        }

        router.delete('/admin/attendance-management/clear');
    };

    return (
        <>
            <PageIntro
                eyebrow="HR Personnel · Attendance Management"
                title="Daily Attendance Records"
                description="List of all daily attendance records for the administrative office of the government."
                className="animate-slide-in-down"
                actions={
                    <span className="app-info-pill">
                        <UserSearch className="size-4 text-primary" />
                        {pagination.total} total records
                    </span>
                }
            />
            <div className="glass-card app-data-shell mx-auto w-full animate-zoom-in-soft bg-card shadow-sm">
                <div className="app-filter-bar py-2">
                    <div className="relative w-full max-w-sm animate-fade-in-left">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search attendance records..."
                            name="search"
                            value={searchTerm}
                            onChange={(event) => {
                                handleSearchChange(event.target.value);
                            }}
                            className="bg-card px-4 py-2 pl-9"
                        />
                    </div>
                    {canManageAttendance && (
                        <div className="app-filter-bar__actions animate-fade-in-right items-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={isImporting}
                            />
                            <Button
                                variant="outline"
                                className="w-fit px-4 py-2"
                                type="button"
                                onClick={handleImportClick}
                                disabled={isImporting}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {isImporting ? 'Importing...' : 'Import File'}
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-fit px-4 py-2"
                                type="button"
                                onClick={handleClearImport}
                                disabled={pagination.total === 0}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Import
                            </Button>
                            <Button
                                variant="default"
                                className="w-fit px-4 py-2"
                                type="button"
                                onClick={handleExportClick}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export to CSV
                            </Button>
                        </div>
                    )}
                </div>

                <Table className="w-full min-w-[58rem]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
                            <TableHead>Employee Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Punch Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendances.map((attendance, index) => (
                            <TableRow
                                key={attendance.id}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                            >
                                <TableCell>
                                    {attendance.employee_name}
                                </TableCell>
                                <TableCell>{attendance.date}</TableCell>
                                <TableCell>{attendance.punch_time}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            attendance.status === 'Present'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}
                                    >
                                        {attendance.status}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            attendance.source === 'biometric'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                : attendance.source === 'manual'
                                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}
                                    >
                                        {attendance.source === 'biometric'
                                            ? 'Biometric'
                                            : attendance.source === 'manual'
                                              ? 'Manual'
                                              : 'Import'}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {attendances.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="app-table-empty px-4 py-8"
                                >
                                    No matching attendance records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <div className="app-table-pagination-bar text-sm font-semibold text-foreground dark:text-[#EAF7E6]">
                    <div className="app-table-pagination-shell">
                        <div className="app-table-pagination-page-size">
                            <span>Rows per page</span>
                            <Select
                                value={String(pagination.perPage)}
                                onValueChange={handleRowsPerPageChange}
                            >
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
                                            onClick={(event) => {
                                                event.preventDefault();
                                                goToPreviousPage();
                                            }}
                                            className={
                                                pagination.currentPage === 1
                                                    ? 'pointer-events-none opacity-50'
                                                    : ''
                                            }
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                goToNextPage();
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
            </div>
        </>
    );
}
