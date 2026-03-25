import { router } from "@inertiajs/react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UserSearch } from "lucide-react";
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
    TableHead,
    TableHeader,
    TableFooter,
    TableRow,
} from "@/components/ui/table";
import * as admin from "@/routes/admin";
import PredictivePerformanceModule from "./predict-performance-eval-modal";

type Employee = {
    id: number;
    name: string;
    email: string;
    role: string;
    employee_id: string;
    position: string;
    date_hired: string;
    age: string;
    performance_rating?: string | null;
    remarks?: string | null;
    notification?: string | null;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type EmployeeSortKey = "employee_id" | "name" | "email" | "position";
type SortDirection = "asc" | "desc";

export function EmployeesTable({
    employees,
    search,
    sort,
    direction,
    pagination,
}: {
    employees: Employee[];
    search: string;
    sort: EmployeeSortKey;
    direction: SortDirection;
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isPredictiveModalOpen, setIsPredictiveModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const visitEmployeesTable = (params: {
        search?: string;
        page?: number;
        perPage?: number;
        sort?: EmployeeSortKey;
        direction?: SortDirection;
    }): void => {
        router.get(
            admin.employeeDirectory().url,
            {
                search: params.search ?? searchTerm,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
                sort: params.sort ?? sort,
                direction: params.direction ?? direction,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["employees", "search", "sort", "direction", "pagination"],
            }
        );
    };

    const renderSortIcon = (column: EmployeeSortKey) => {
        if (sort !== column) {
            return <ArrowUpDown className="size-4" />;
        }

        return direction === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />;
    };

    const handleSortChange = (column: EmployeeSortKey): void => {
        const nextDirection: SortDirection = sort === column && direction === "asc" ? "desc" : "asc";

        visitEmployeesTable({
            page: 1,
            sort: column,
            direction: nextDirection,
        });
    };

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        visitEmployeesTable({ search: value, page: 1 });
    };

    const handleRowsPerPageChange = (value: string): void => {
        visitEmployeesTable({ page: 1, perPage: Number(value) });
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) {
            return;
        }

        visitEmployeesTable({ page: pagination.currentPage - 1 });
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) {
            return;
        }

        visitEmployeesTable({ page: pagination.currentPage + 1 });
    };

    const openPredictiveModal = (employee: Employee): void => {
        setSelectedEmployee(employee);
        setIsPredictiveModalOpen(true);
    };

    return (
        <>
            <div className="animate-slide-in-down top-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <UserSearch className="h-8 w-8" />
                            Employee Data Management
                        </h1>
                        <p className="mt-1 text-muted-foreground">List of all employees working for the adminstrative office of the government.</p>
                    </div>
                </div>
            </div>
            <div className="glass-card animate-zoom-in-soft mx-auto w-full rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex w-full items-center justify-between gap-4 py-6">
                    <div className="animate-fade-in-left relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Search employees..."
                            name="search"
                            value={searchTerm}
                            onChange={(event) => {
                                handleSearchChange(event.target.value);
                            }}
                            className="bg-card px-4 py-2 pl-9"
                        />
                    </div>
                </div>
                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("employee_id")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Employee ID
                                    {renderSortIcon("employee_id")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("name")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Name
                                    {renderSortIcon("name")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("email")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Email Address
                                    {renderSortIcon("email")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("position")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Position
                                    {renderSortIcon("position")}
                                </Button>
                            </TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead className="text-right">Performance Evaluation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee, index) => (
                            <TableRow
                                key={employee.id}
                                style={{ animationDelay: `${index * 28}ms` }}
                                className={`text-sm font-semibold text-foreground ${index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"
                                    } animate-fade-in-up`}
                            >
                                <TableCell>{employee.employee_id}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>{employee.age}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        onClick={() => openPredictiveModal(employee)}
                                        className="mx-auto my-auto w-1/2 rounded-md bg-secondary px-4 py-2 font-bold text-foreground shadow-md transition-opacity hover:opacity-90 hover:shadow-lg"
                                    >
                                        Click here
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80">
                                    No matching employees found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                            <TableCell colSpan={6}>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>Rows per page</span>
                                        <Select value={String(pagination.perPage)} onValueChange={handleRowsPerPageChange}>
                                            <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]" id="select-rows-per-page">
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
            <PredictivePerformanceModule
                isOpen={isPredictiveModalOpen}
                onOpenChange={setIsPredictiveModalOpen}
                employee={selectedEmployee}
            />
        </>
    );
}
