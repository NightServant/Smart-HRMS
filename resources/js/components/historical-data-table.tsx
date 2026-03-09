import { router } from "@inertiajs/react";
import { Upload, Search, UserSearch, Trash2 } from "lucide-react";
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

export function HistoricalDataTable({
    historicalData,
    search,
    pagination,
}: {
    historicalData: HistoricalData[];
    search: string;
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isImporting, setIsImporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        router.get(
            admin.historicalData().url,
            { search: value, page: 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["historicalData", "search", "pagination"],
            }
        );
    };

    const handleRowsPerPageChange = (value: string): void => {
        router.get(
            admin.historicalData().url,
            { search: searchTerm, page: 1, perPage: Number(value) },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["historicalData", "search", "pagination"],
            }
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) {
            return;
        }

        router.get(
            admin.historicalData().url,
            { search: searchTerm, page: pagination.currentPage - 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["historicalData", "search", "pagination"],
            }
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) {
            return;
        }

        router.get(
            admin.historicalData().url,
            { search: searchTerm, page: pagination.currentPage + 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["historicalData", "search", "pagination"],
            }
        );
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

    return (
        <>
            <div className="animate-slide-in-down container mx-auto max-w-9xl px-6 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <UserSearch className="h-8 w-8" />
                            Historical Data Records
                        </h1>
                        <p className="mt-1 text-muted-foreground">Historical employee performance and attendance metrics.</p>
                    </div>
                </div>
            </div>
            <div className="animate-zoom-in-soft hover-lift-soft mx-auto w-full max-w-7xl rounded-md border border-border bg-card/80 p-4 shadow-xl">
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

                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead className="px-4 py-3">Employee Name</TableHead>
                            <TableHead className="px-4 py-3">Department</TableHead>
                            <TableHead className="px-4 py-3">Year</TableHead>
                            <TableHead className="px-4 py-3">Quarter</TableHead>
                            <TableHead className="px-4 py-3">Attendance and Punctuality Rate</TableHead>
                            <TableHead className="px-4 py-3">Absenteeism Days</TableHead>
                            <TableHead className="px-4 py-3">Tardiness Incidents</TableHead>
                            <TableHead className="px-4 py-3">Training Completion Status</TableHead>
                            <TableHead className="px-4 py-3">Evaluated Performance Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historicalData.map((record, index) => (
                            <TableRow
                                key={record.id}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"}`}
                            >
                                <TableCell className="px-4 py-2">{record.employeeName}</TableCell>
                                <TableCell className="px-4 py-2">{record.departmentName}</TableCell>
                                <TableCell className="px-4 py-2">{record.year}</TableCell>
                                <TableCell className="px-4 py-2">{record.quarter}</TableCell>
                                <TableCell className="px-4 py-2 text-center">{record.attendancePunctualityRate}</TableCell>
                                <TableCell className="px-4 py-2 text-center">{record.absenteeismDays}</TableCell>
                                <TableCell className="px-4 py-2 text-center">{record.tardinessIncidents}</TableCell>
                                <TableCell className="px-4 py-2 text-center">{record.trainingCompletionStatus}</TableCell>
                                <TableCell className="px-4 py-2 text-center">{record.evaluatedPerformanceScore}</TableCell>
                            </TableRow>
                        ))}
                        {historicalData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="bg-[#DDEFD7] px-4 py-3 text-center dark:bg-[#345A34]/80">
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
