import { router } from "@inertiajs/react";
import { ArrowDown, ArrowUp, ArrowUpDown, Upload, Search, UserSearch, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
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

type HistoricalData = {
    id: number;
    employeeName: string;
    departmentName: string;
    year: number;
    quarter: string;
    attendancePunctualityRate: string;
    absenteeismDays: number;
    tardinessIncidents: number;
    trainingCompletionStatus: number;
    evaluatedPerformanceScore: number;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type HistoricalSortKey =
    | "employee_name"
    | "department_name"
    | "year"
    | "quarter"
    | "attendance_punctuality_rate"
    | "absenteeism_days"
    | "tardiness_incidents"
    | "training_completion_status"
    | "evaluated_performance_score";

type SortDirection = "asc" | "desc";

type GroupedHistoricalRow = {
    record: HistoricalData;
    employeeRowSpan: number;
    yearRowSpan: number;
    showEmployee: boolean;
    showDepartment: boolean;
    showYear: boolean;
};

export function HistoricalDataTable({
    historicalData,
    search,
    sort,
    direction,
    pagination,
}: {
    historicalData: HistoricalData[];
    search: string;
    sort: HistoricalSortKey;
    direction: SortDirection;
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isImporting, setIsImporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const visitHistoricalDataTable = (params: {
        search?: string;
        page?: number;
        perPage?: number;
        sort?: HistoricalSortKey;
        direction?: SortDirection;
    }): void => {
        router.get(
            admin.historicalData().url,
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
                only: ["historicalData", "search", "sort", "direction", "pagination"],
            }
        );
    };

    const renderSortIcon = (column: HistoricalSortKey) => {
        if (sort !== column) {
            return <ArrowUpDown className="size-4" />;
        }

        return direction === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />;
    };

    const handleSortChange = (column: HistoricalSortKey): void => {
        const nextDirection: SortDirection = sort === column && direction === "asc" ? "desc" : "asc";

        visitHistoricalDataTable({
            page: 1,
            sort: column,
            direction: nextDirection,
        });
    };

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        visitHistoricalDataTable({ search: value, page: 1 });
    };

    const handleRowsPerPageChange = (value: string): void => {
        visitHistoricalDataTable({ page: 1, perPage: Number(value) });
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) {
            return;
        }

        visitHistoricalDataTable({ page: pagination.currentPage - 1 });
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) {
            return;
        }

        visitHistoricalDataTable({ page: pagination.currentPage + 1 });
    };

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            toast.error("Please select a valid CSV file.");
            return;
        }

        setIsImporting(true);
        router.post('/admin/historical-data/import-csv', { historical_csv: file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                toast.success("CSV file imported successfully!");
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error(typeof firstError === "string" ? firstError : "Failed to import CSV file.");
            },
            onFinish: () => {
                setIsImporting(false);
            },
        });
    };

    const handleClearImportedClick = (): void => {
        const confirmed = window.confirm("Clear all imported historical records?");
        if (!confirmed) {
            return;
        }

        setIsClearing(true);
        router.delete('/admin/historical-data/clear-imported', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Imported historical records cleared.");
            },
            onError: () => {
                toast.error("Failed to clear imported historical records.");
            },
            onFinish: () => {
                setIsClearing(false);
            },
        });
    };

    const groupedHistoricalData: GroupedHistoricalRow[] = [];

    for (let index = 0; index < historicalData.length; index += 1) {
        const record = historicalData[index];
        const employeeGroupKey = `${record.employeeName}::${record.departmentName}`;
        const yearGroupKey = `${employeeGroupKey}::${record.year}`;
        const previousRecord = historicalData[index - 1];
        const previousEmployeeGroupKey = previousRecord
            ? `${previousRecord.employeeName}::${previousRecord.departmentName}`
            : null;
        const previousYearGroupKey = previousRecord
            ? `${previousRecord.employeeName}::${previousRecord.departmentName}::${previousRecord.year}`
            : null;
        const showEmployee = employeeGroupKey !== previousEmployeeGroupKey;
        const showYear = yearGroupKey !== previousYearGroupKey;

        let employeeRowSpan = 0;
        let yearRowSpan = 0;

        if (showEmployee) {
            employeeRowSpan = 1;

            for (let nextIndex = index + 1; nextIndex < historicalData.length; nextIndex += 1) {
                const nextRecord = historicalData[nextIndex];
                const nextEmployeeGroupKey = `${nextRecord.employeeName}::${nextRecord.departmentName}`;

                if (nextEmployeeGroupKey !== employeeGroupKey) {
                    break;
                }

                employeeRowSpan += 1;
            }
        }

        if (showYear) {
            yearRowSpan = 1;

            for (let nextIndex = index + 1; nextIndex < historicalData.length; nextIndex += 1) {
                const nextRecord = historicalData[nextIndex];
                const nextYearGroupKey = `${nextRecord.employeeName}::${nextRecord.departmentName}::${nextRecord.year}`;

                if (nextYearGroupKey !== yearGroupKey) {
                    break;
                }

                yearRowSpan += 1;
            }
        }

        groupedHistoricalData.push({
            record,
            employeeRowSpan,
            yearRowSpan,
            showEmployee,
            showDepartment: showEmployee,
            showYear,
        });
    }

    return (
        <>
            <div className="animate-fade-in-down">
                <div className="flex justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <UserSearch className="h-8 w-8" />
                            Historical Data Records
                        </h1>
                        <p className="mt-1 text-muted-foreground">Historical employee performance and attendance metrics.</p>
                    </div>
                </div>
            </div>
            <div className="animate-zoom-in-soft hover-lift-soft mx-auto w-full rounded-md border border-border bg-card/80 p-4 shadow-xl">
                <div className="flex w-full items-center justify-between gap-4 py-6">
                    <div className="animate-fade-in-left relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Search historical data..."
                            name="search"
                            value={searchTerm}
                            onChange={(event) => {
                                handleSearchChange(event.target.value);
                            }}
                            className="bg-card px-4 py-2 pl-9"
                        />
                    </div>
                    <div className="flex flex-row animate-fade-in-right items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="outline"
                            className="animate-fade-in-right w-fit px-4 py-2"
                            type="button"
                            onClick={handleImportClick}
                            disabled={isImporting}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Import CSV
                        </Button>
                        <Button
                            variant="destructive"
                            className="animate-fade-in-right w-fit px-4 py-2"
                            type="button"
                            onClick={handleClearImportedClick}
                            disabled={isClearing}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Imported
                        </Button>
                    </div>
                </div>

                <Table className="w-full border-collapse">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("employee_name")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Employee Name
                                    {renderSortIcon("employee_name")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("department_name")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Department
                                    {renderSortIcon("department_name")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("year")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Year
                                    {renderSortIcon("year")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("quarter")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Quarter
                                    {renderSortIcon("quarter")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("attendance_punctuality_rate")} className="h-auto px-0 text-left text-white hover:bg-transparent hover:text-white">
                                    Attendance and Punctuality Rate
                                    {renderSortIcon("attendance_punctuality_rate")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("absenteeism_days")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Absenteeism Days
                                    {renderSortIcon("absenteeism_days")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("tardiness_incidents")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Tardiness Incidents
                                    {renderSortIcon("tardiness_incidents")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("training_completion_status")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Training Completion Status
                                    {renderSortIcon("training_completion_status")}
                                </Button>
                            </TableHead>
                            <TableHead className="border border-[#4A7C3C] px-4 py-3">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSortChange("evaluated_performance_score")} className="h-auto px-0 text-white hover:bg-transparent hover:text-white">
                                    Evaluated Performance Score
                                    {renderSortIcon("evaluated_performance_score")}
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedHistoricalData.map(({ record, employeeRowSpan, yearRowSpan, showEmployee, showDepartment, showYear }, index) => (
                            <TableRow
                                key={record.id}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"}`}
                            >
                                {showEmployee && (
                                    <TableCell rowSpan={employeeRowSpan} className="border border-[#4A7C3C] px-4 py-2 align-top font-bold">
                                        {record.employeeName}
                                    </TableCell>
                                )}
                                {showDepartment && (
                                    <TableCell rowSpan={employeeRowSpan} className="border border-[#4A7C3C] px-4 py-2 align-top">
                                        {record.departmentName}
                                    </TableCell>
                                )}
                                {showYear && (
                                    <TableCell rowSpan={yearRowSpan} className="border border-[#4A7C3C] px-4 py-2 align-top">
                                        {record.year}
                                    </TableCell>
                                )}
                                <TableCell className="border border-[#4A7C3C] px-4 py-2">{record.quarter}</TableCell>
                                <TableCell className="border border-[#4A7C3C] px-4 py-2 text-center">{record.attendancePunctualityRate}</TableCell>
                                <TableCell className="border border-[#4A7C3C] px-4 py-2 text-center">{record.absenteeismDays}</TableCell>
                                <TableCell className="border border-[#4A7C3C] px-4 py-2 text-center">{record.tardinessIncidents}</TableCell>
                                <TableCell className="border border-[#4A7C3C] px-4 py-2 text-center">{record.trainingCompletionStatus}</TableCell>
                                <TableCell className="border border-[#4A7C3C] px-4 py-2 text-center">{record.evaluatedPerformanceScore}</TableCell>
                            </TableRow>
                        ))}
                        {historicalData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="border border-[#4A7C3C] bg-[#DDEFD7] px-4 py-3 text-center dark:bg-[#345A34]/80">
                                    No matching historical records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                            <TableCell colSpan={9} className="px-4 py-3">
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
