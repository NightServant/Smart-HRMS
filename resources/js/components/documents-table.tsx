import { router, usePage } from "@inertiajs/react";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
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
import { evaluationPage } from "@/routes";
import { documentManagement } from "@/routes";
import type { Auth } from "@/types";

type DocumentEmployee = {
    id: number;
    name: string;
    email: string;
    role: string;
    position: string;
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
                only: ["employees", "search", "pagination"],
            }
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
                only: ["employees", "search", "pagination"],
            }
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) {
            return;
        }

        router.get(
            documentManagement().url,
            { search: searchTerm, page: pagination.currentPage - 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["employees", "search", "pagination"],
            }
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) {
            return;
        }

        router.get(
            documentManagement().url,
            { search: searchTerm, page: pagination.currentPage + 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["employees", "search", "pagination"],
            }
        );
    };
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <>
            <div className="animate-slide-in-down">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <FileText className="h-8 w-8" />
                            Document Management
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Evaluate the performance of employees in the department.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Assigned Evaluator: {auth.user.name}
                        </p>
                    </div>
                </div>
            </div>
            <div className="animate-zoom-in-soft hover-lift-soft mx-auto w-full rounded-md border border-border bg-card/80 p-4 shadow-xl">
                <div className="flex w-full items-center justify-between gap-4 py-6">
                    <div className="animate-fade-in-left relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
                <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[900px]">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead>Name</TableHead>
                            <TableHead>Email Address</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="w-[26rem] text-center">Evaluation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee, index) => (
                            <TableRow
                                key={employee.id}
                                style={{ animationDelay: `${index * 28}ms` }}
                                className={`text-sm font-semibold text-foreground ${
                                    index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"
                                } animate-fade-in-up`}
                            >
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell className="text-center">
                                        <Button asChild type="button" className="bg-secondary px-3 py-2 w-1/2 text-xs font-bold text-foreground shadow-md transition-colors hover:bg-secondary/90">
                                            <a href={evaluationPage().url} target="_blank" rel="noopener noreferrer">
                                               Evaluate
                                            </a>
                                        </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80">
                                    No matching records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                            <TableCell colSpan={4}>
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
            </div>
        </>
    );
}
