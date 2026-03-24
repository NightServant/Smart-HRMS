import { router } from "@inertiajs/react";
import { Search, UserSearch } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import * as admin from "@/routes/admin";

type LeaveRequest = {
    id: number;
    name: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status?: string;
    stage?: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

export default function LeaveRequestTable({
    leaveRequests,
    search,
    pagination,
}: {
    leaveRequests: LeaveRequest[];
    search: string;
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [rejectingRowId, setRejectingRowId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processingId, setProcessingId] = useState<number | null>(null);

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        router.get(
            admin.leaveManagement().url,
            { search: value, page: 1, perPage: pagination.perPage },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["leaveRequests", "search", "pagination"],
            }
        );
    };

    const handleRowsPerPageChange = (value: string): void => {
        router.get(
            admin.leaveManagement().url,
            { search: searchTerm, page: 1, perPage: Number(value) },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["leaveRequests", "search", "pagination"],
            }
        );
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) return;
        router.get(
            admin.leaveManagement().url,
            { search: searchTerm, page: pagination.currentPage - 1, perPage: pagination.perPage },
            { preserveScroll: true, preserveState: true, replace: true, only: ["leaveRequests", "search", "pagination"] }
        );
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) return;
        router.get(
            admin.leaveManagement().url,
            { search: searchTerm, page: pagination.currentPage + 1, perPage: pagination.perPage },
            { preserveScroll: true, preserveState: true, replace: true, only: ["leaveRequests", "search", "pagination"] }
        );
    };

    const isActionable = (lr: LeaveRequest): boolean => lr.stage === 'sent_to_department_head';

    const handleApprove = (id: number): void => {
        setProcessingId(id);
        router.post(
            `/leave/${id}/approve`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
                onError: () => setProcessingId(null),
            }
        );
    };

    const handleReject = (id: number): void => {
        if (!rejectionReason.trim()) return;
        setProcessingId(id);
        router.post(
            `/leave/${id}/reject`,
            { rejection_reason: rejectionReason.trim() },
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessingId(null);
                    setRejectingRowId(null);
                    setRejectionReason("");
                },
                onError: () => setProcessingId(null),
            }
        );
    };

    return (
        <>
            <div className="animate-slide-in-down">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <UserSearch className="h-8 w-8" />
                            Leave Request Records
                        </h1>
                        <p className="mt-1 text-muted-foreground">List of leave requests from employees in the administrative office.</p>
                    </div>
                </div>
            </div>

            <div className="animate-zoom-in-soft mx-auto w-full rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex w-full items-center justify-between gap-4 py-6">
                    <div className="animate-fade-in-left relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Search leave requests..."
                            name="search"
                            value={searchTerm}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            className="bg-card px-4 py-2 pl-9"
                        />
                    </div>
                </div>

                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                            <TableHead className="px-4 py-3">ID</TableHead>
                            <TableHead className="px-4 py-3">Name</TableHead>
                            <TableHead className="px-4 py-3">Leave Type</TableHead>
                            <TableHead className="px-4 py-3">Start Date</TableHead>
                            <TableHead className="px-4 py-3">End Date</TableHead>
                            <TableHead className="px-4 py-3">Reason</TableHead>
                            <TableHead className="px-4 py-3 text-center">Status</TableHead>
                            <TableHead className="px-4 py-3 text-center">Action 1</TableHead>
                            <TableHead className="px-4 py-3 text-center">Action 2</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaveRequests.map((leaveRequest, index) => (
                            <>
                                <TableRow
                                    key={leaveRequest.id}
                                    style={{ animationDelay: `${index * 24}ms` }}
                                    className={`text-sm font-semibold text-foreground ${
                                        index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"
                                    } animate-fade-in-up`}
                                >
                                    <TableCell className="px-4 py-2">{leaveRequest.id}</TableCell>
                                    <TableCell className="px-4 py-2">{leaveRequest.name}</TableCell>
                                    <TableCell className="px-4 py-2">{leaveRequest.leaveType}</TableCell>
                                    <TableCell className="px-4 py-2">{leaveRequest.startDate}</TableCell>
                                    <TableCell className="px-4 py-2">{leaveRequest.endDate}</TableCell>
                                    <TableCell className="px-4 py-2">{leaveRequest.reason}</TableCell>
                                    <TableCell className="px-4 py-2 text-center">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                            leaveRequest.status === 'completed' ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            leaveRequest.status === 'returned' ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            leaveRequest.status === 'routed' ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                            {leaveRequest.status || 'pending'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        {isActionable(leaveRequest) ? (
                                            <Button
                                                type="button"
                                                className="mx-auto block w-full max-w-48 rounded-md bg-secondary px-4 py-2 font-bold text-foreground shadow-md transition-opacity hover:opacity-90 hover:shadow-lg disabled:opacity-50"
                                                disabled={processingId === leaveRequest.id}
                                                onClick={() => handleApprove(leaveRequest.id)}
                                            >
                                                {processingId === leaveRequest.id ? "Processing..." : "Approve"}
                                            </Button>
                                        ) : (
                                            <span className="block text-center text-xs text-muted-foreground">&mdash;</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        {isActionable(leaveRequest) ? (
                                            <Button
                                                type="button"
                                                className="mx-auto block w-full max-w-48 bg-destructive text-white px-4 py-2 font-bold rounded-md shadow-md transition-opacity hover:opacity-90 hover:shadow-lg"
                                                onClick={() => {
                                                    if (rejectingRowId === leaveRequest.id) {
                                                        setRejectingRowId(null);
                                                        setRejectionReason("");
                                                    } else {
                                                        setRejectingRowId(leaveRequest.id);
                                                        setRejectionReason("");
                                                    }
                                                }}
                                            >
                                                Reject
                                            </Button>
                                        ) : (
                                            <span className="block text-center text-xs text-muted-foreground">&mdash;</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {rejectingRowId === leaveRequest.id && isActionable(leaveRequest) && (
                                    <TableRow key={`reject-${leaveRequest.id}`} className="bg-red-50 dark:bg-red-950/30">
                                        <TableCell colSpan={9} className="px-4 py-3">
                                            <div className="flex items-end gap-3">
                                                <div className="flex-1">
                                                    <label className="mb-1 block text-sm font-semibold text-foreground">
                                                        Reason for Rejection (required)
                                                    </label>
                                                    <Textarea
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Please provide a reason for rejecting this leave request..."
                                                        className="min-h-20 resize-none"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        disabled={!rejectionReason.trim() || processingId === leaveRequest.id}
                                                        onClick={() => handleReject(leaveRequest.id)}
                                                    >
                                                        {processingId === leaveRequest.id ? "Submitting..." : "Confirm Rejection"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setRejectingRowId(null);
                                                            setRejectionReason("");
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        ))}
                        {leaveRequests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="bg-[#DDEFD7] px-4 py-3 text-center dark:bg-[#345A34]/80">
                                    No matching leave requests found.
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
                                                        onClick={(event) => { event.preventDefault(); goToPreviousPage(); }}
                                                        className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                    />
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(event) => { event.preventDefault(); goToNextPage(); }}
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
