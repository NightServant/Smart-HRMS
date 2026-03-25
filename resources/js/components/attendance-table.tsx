import { router } from "@inertiajs/react";
import { Search, UserSearch, Download, Upload, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import * as admin from "@/routes/admin";

type Attendance = {
    id: number;
    employee_name: string;
    date: string;
    punch_time: string;
    status: string;
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
    const [searchTerm, setSearchTerm] = useState(search);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        router.get(
            admin.attendanceManagement().url,
            { search: value, page: 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["attendances", "search", "pagination"],
            }
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
                only: ["attendances", "search", "pagination"],
            }
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) return;
        router.get(
            admin.attendanceManagement().url,
            { search: searchTerm, page: pagination.currentPage - 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["attendances", "search", "pagination"],
            }
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) return;
        router.get(
            admin.attendanceManagement().url,
            { search: searchTerm, page: pagination.currentPage + 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["attendances", "search", "pagination"],
            }
        );
    };

    const handleExportClick = (): void => {
        const searchParam = encodeURIComponent(searchTerm);
        window.location.href = `/admin/attendance-management/export-csv?search=${searchParam}`;
    };

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        if (!file) return;

        router.post('/admin/attendance-management/import-csv', { file }, {
            forceFormData: true,
            onStart: () => setIsImporting(true),
            onFinish: () => setIsImporting(false),
        });

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearImport = (): void => {
        if (!confirm('Are you sure you want to clear all attendance records? This action cannot be undone.')) {
            return;
        }

        router.delete('/admin/attendance-management/clear');
    };

    return (
        <>
            <div className="animate-slide-in-down top">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <UserSearch className="h-8 w-8" />
                            Daily Attendance Records
                        </h1>
                        <p className="mt-1 text-muted-foreground">List of all daily attendance records for the administrative office of the government.</p>
                    </div>
                </div>
            </div>
            <div className="glass-card animate-zoom-in-soft mx-auto w-full rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex w-full flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="animate-fade-in-left relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
                    <div className="flex flex-wrap animate-fade-in-right items-center gap-2">
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
                </div>

                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead className="px-4 py-3">Employee Name</TableHead>
                            <TableHead className="px-4 py-3">Date</TableHead>
                            <TableHead className="px-4 py-3">Punch Time</TableHead>
                            <TableHead className="px-4 py-3">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendances.map((attendance, index) => (
                            <TableRow
                                key={attendance.id}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"
                                    }`}
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
                            </TableRow>
                        ))}
                        {attendances.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="bg-[#DDEFD7] px-4 py-3 text-center dark:bg-[#345A34]/80">
                                    No matching attendance records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                            <TableCell colSpan={4} className="px-4 py-3">
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
                                                            goToPreviousPage();
                                                        }}
                                                        className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                    />
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            goToNextPage();
                                                        }}
                                                        className={pagination.currentPage === pagination.lastPage ? "pointer-events-none opacity-50" : ""}
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
        </>
    );
}
