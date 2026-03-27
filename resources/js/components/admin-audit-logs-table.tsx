import { router } from '@inertiajs/react';
import { Search, ShieldCheck, ShieldX, TimerReset } from 'lucide-react';
import { useState } from 'react';
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

type AuditLog = {
    id: number;
    loggedAt: string | null;
    employeeName: string;
    employeeId: string;
    documentType: string;
    documentReference: string;
    routingAction: string;
    confidencePct: number | null;
    compliancePassed: boolean;
    status?: string | null;
    stage?: string | null;
};

type Filters = {
    search: string;
    documentType: string;
    routingAction: string;
    compliance: string;
    confidence: string;
    dateFrom: string;
    dateTo: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

export function AdminAuditLogsTable({
    logs,
    filters,
    routingActions,
    pagination,
}: {
    logs: AuditLog[];
    filters: Filters;
    routingActions: string[];
    pagination: PaginationMeta;
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [documentType, setDocumentType] = useState(filters.documentType || 'all');
    const [routingAction, setRoutingAction] = useState(filters.routingAction || 'all');
    const [compliance, setCompliance] = useState(filters.compliance || 'all');
    const [confidence, setConfidence] = useState(filters.confidence || 'all');
    const [dateFrom, setDateFrom] = useState(filters.dateFrom);
    const [dateTo, setDateTo] = useState(filters.dateTo);

    const visit = (params: Partial<Filters> & { page?: number; perPage?: number }): void => {
        router.get(
            admin.auditLogs().url,
            {
                search: params.search ?? searchTerm,
                documentType: (params.documentType ?? documentType) === 'all' ? '' : params.documentType ?? documentType,
                routingAction: (params.routingAction ?? routingAction) === 'all' ? '' : params.routingAction ?? routingAction,
                compliance: (params.compliance ?? compliance) === 'all' ? '' : params.compliance ?? compliance,
                confidence: (params.confidence ?? confidence) === 'all' ? '' : params.confidence ?? confidence,
                dateFrom: params.dateFrom ?? dateFrom,
                dateTo: params.dateTo ?? dateTo,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['logs', 'filters', 'pagination', 'summary', 'routingActions'],
            },
        );
    };

    return (
        <div className="glass-card animate-zoom-in-soft mx-auto w-full rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-4 py-6 xl:grid-cols-[minmax(0,1fr)_10rem_13rem_10rem_10rem_11rem_11rem]">
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            visit({ search: event.target.value, page: 1 });
                        }}
                        className="pl-9"
                        placeholder="Search employee or routing action..."
                    />
                </div>
                <Select value={documentType} onValueChange={(value) => {
                    setDocumentType(value);
                    visit({ documentType: value, page: 1 });
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Document" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All documents</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="ipcr">IPCR</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Select value={routingAction} onValueChange={(value) => {
                    setRoutingAction(value);
                    visit({ routingAction: value, page: 1 });
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Routing action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All actions</SelectItem>
                            {routingActions.map((action) => (
                                <SelectItem key={action} value={action}>
                                    {action}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Select value={compliance} onValueChange={(value) => {
                    setCompliance(value);
                    visit({ compliance: value, page: 1 });
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Compliance" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All compliance</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Select value={confidence} onValueChange={(value) => {
                    setConfidence(value);
                    visit({ confidence: value, page: 1 });
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Confidence" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All confidence</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
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
                        <TableHead>Employee</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Routing Action</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log, index) => (
                        <TableRow
                            key={log.id}
                            style={{ animationDelay: `${index * 24}ms` }}
                            className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}`}
                        >
                            <TableCell>{log.loggedAt ?? '-'}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{log.employeeName}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{log.employeeId}</span>
                                </div>
                            </TableCell>
                            <TableCell className="uppercase">{log.documentType}</TableCell>
                            <TableCell>{log.documentReference}</TableCell>
                            <TableCell>{log.routingAction}</TableCell>
                            <TableCell>{log.confidencePct !== null ? `${log.confidencePct.toFixed(2)}%` : 'N/A'}</TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${log.compliancePassed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {log.compliancePassed ? <ShieldCheck className="size-3" /> : <ShieldX className="size-3" />}
                                    {log.compliancePassed ? 'Passed' : 'Failed'}
                                </span>
                            </TableCell>
                            <TableCell>{log.status ?? '-'}</TableCell>
                            <TableCell>{log.stage ?? '-'}</TableCell>
                        </TableRow>
                    ))}
                    {logs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80">
                                No audit log records found for the selected filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                        <TableCell colSpan={9}>
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
                Audit entries are read-only and reflect Intelligent Workflow Routing outcomes for leave and IPCR processing.
            </div>
        </div>
    );
}
