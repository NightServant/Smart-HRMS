import { Link, router, usePage } from '@inertiajs/react';
import { FileText, Search } from 'lucide-react';
import { useState } from 'react';
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
import { evaluationPage } from '@/routes';
import { documentManagement } from '@/routes';
import type { Auth } from '@/types';

type DocumentEmployee = {
    id: number;
    name: string;
    email: string;
    role: string;
    position: string;
    employeeId: string | null;
    submissionStatus: string | null;
    submissionStage: string | null;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

export default function DocumentsTable({
    employees,
    search,
    pagination,
}: {
    employees: DocumentEmployee[];
    search: string;
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        router.get(
            documentManagement().url,
            { search: value, page: 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['employees', 'search', 'pagination'],
            },
        );
    };

    const handleRowsPerPageChange = (value: string): void => {
        router.get(
            documentManagement().url,
            { search: searchTerm, page: 1, perPage: Number(value) },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['employees', 'search', 'pagination'],
            },
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) {
            return;
        }

        router.get(
            documentManagement().url,
            {
                search: searchTerm,
                page: pagination.currentPage - 1,
                perPage: pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['employees', 'search', 'pagination'],
            },
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) {
            return;
        }

        router.get(
            documentManagement().url,
            {
                search: searchTerm,
                page: pagination.currentPage + 1,
                perPage: pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['employees', 'search', 'pagination'],
            },
        );
    };
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <div className="glass-card app-data-shell mx-auto w-full max-w-none animate-zoom-in-soft bg-card shadow-sm">
            <div className="app-data-shell__header">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                            <FileText className="size-4 text-primary" />
                            Assigned evaluation queue
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Assigned Evaluator: {auth.user.name}
                        </p>
                    </div>
                </div>
                <div className="app-filter-bar">
                    <div className="relative w-full max-w-sm animate-fade-in-left">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search records..."
                            name="search"
                            value={searchTerm}
                            onChange={(event) => {
                                handleSearchChange(event.target.value);
                            }}
                            className="bg-card px-4 py-2 pl-9"
                        />
                    </div>
                </div>
            </div>
            <div className="app-table-scroll">
                <Table className="w-full min-w-[1120px] xl:min-w-[1280px]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email Address</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="w-[26rem] text-center">
                                Evaluation
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee, index) => (
                            <TableRow
                                key={employee.id}
                                style={{ animationDelay: `${index * 28}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                            >
                                <TableCell>{employee.employeeId}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell className="text-center">
                                    {employee.submissionStatus ===
                                        'completed' ||
                                    employee.submissionStage ===
                                        'evaluation_saved' ? (
                                        <Button
                                            asChild
                                            type="button"
                                            variant="outline"
                                            className="w-1/2 bg-secondary px-3 py-2 text-xs font-bold shadow-md transition-colors"
                                        >
                                            <Link
                                                href={
                                                    evaluationPage({
                                                        query: {
                                                            employee_id:
                                                                employee.employeeId ??
                                                                '',
                                                        },
                                                    }).url
                                                }
                                            >
                                                View Results
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            asChild
                                            type="button"
                                            className="w-1/2 bg-secondary px-3 py-2 text-xs font-bold text-foreground shadow-md transition-colors hover:bg-secondary/90"
                                        >
                                            <Link
                                                href={
                                                    evaluationPage({
                                                        query: {
                                                            employee_id:
                                                                employee.employeeId ??
                                                                '',
                                                        },
                                                    }).url
                                                }
                                            >
                                                Evaluate
                                            </Link>
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="app-table-empty py-8"
                                >
                                    No matching records found.
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
        </div>
    );
}
