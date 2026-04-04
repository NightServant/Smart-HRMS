import { router, useForm } from '@inertiajs/react';
import { CalendarDays, ChevronDown, Megaphone } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Seminar = {
    id: number;
    description: string;
    target_performance_area: string;
};

type SeminarFormData = {
    description: string;
    target_performance_area: string;
};

const initialFormData: SeminarFormData = {
    description: '',
    target_performance_area: '',
};

const targetPerformanceAreas = [
    'Personnel Management',
    'Records and Communication',
    'Logistics and Procurement',
    'Service Delivery',
    'Workforce Support',
    'Policy Compliance',
    'Capability Building',
    'Document Routing',
    'Reporting and Communication',
    'Stakeholder Coordination',
    'Inventory and Supply Monitoring',
    'Procurement Support',
    'Facility Readiness',
    'Frontline Assistance',
    'Process Improvement',
    'Special Assignments',
];

export const TrainingsSeminarsTable = ({ seminars }: { seminars: Seminar[] }) => {
    const [editingSeminarId, setEditingSeminarId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isNotifying, setIsNotifying] = useState(false);

    const form = useForm<SeminarFormData>(initialFormData);

    const totalPages = Math.max(1, Math.ceil(seminars.length / rowsPerPage));

    const paginatedSeminars = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return seminars.slice(start, end);
    }, [currentPage, rowsPerPage, seminars]);

    const submitForm = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const endpoint = editingSeminarId === null ? '/seminars' : `/seminars/${editingSeminarId}`;
        const submit = editingSeminarId === null ? form.post : form.put;

        submit(endpoint, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingSeminarId(null);
                form.reset();
            },
        });
    };

    const editSeminar = (seminar: Seminar): void => {
        setEditingSeminarId(seminar.id);
        form.setData({
            description: seminar.description,
            target_performance_area: seminar.target_performance_area,
        });
    };

    const deleteSeminar = (seminarId: number): void => {
        form.delete(`/seminars/${seminarId}`, {
            preserveScroll: true,
        });
    };

    const cancelEdit = (): void => {
        setEditingSeminarId(null);
        form.reset();
    };

    const notifyEmployees = (): void => {
        setIsNotifying(true);
        router.post('/admin/training-suggestions/notify', {}, {
            preserveScroll: true,
            onFinish: () => setIsNotifying(false),
        });
    };

    const goToPreviousPage = (): void => {
        setCurrentPage((page) => Math.max(1, page - 1));
    };

    const goToNextPage = (): void => {
        setCurrentPage((page) => Math.min(totalPages, page + 1));
    };

    const handleRowsPerPageChange = (value: string): void => {
        setRowsPerPage(Number(value));
        setCurrentPage(1);
    };

    return (
        <>
            <div className="animate-slide-in-down">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <CalendarDays className="h-8 w-8" />
                            Training Suggestions
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Define training criteria and notify employees to find relevant seminars.
                        </p>
                    </div>
                    <Button
                        onClick={notifyEmployees}
                        disabled={isNotifying || seminars.length === 0}
                        className="gap-2"
                    >
                        <Megaphone className="size-4" />
                        {isNotifying ? 'Sending...' : 'Notify Employees'}
                    </Button>
                </div>
                <div className="glass-card animate-zoom-in-soft mx-auto w-full rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold">Training Suggestions List</h2>

                    <form onSubmit={submitForm} className="animate-fade-in-left mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="seminar-description">Description</Label>
                            <Input
                                id="seminar-description"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="seminar-target-area">Target Performance Area</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        id="seminar-target-area"
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-between text-left font-normal"
                                    >
                                        {form.data.target_performance_area || 'Select administrative service focus area'}
                                        <ChevronDown className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                                    {targetPerformanceAreas.map((area) => (
                                        <DropdownMenuItem
                                            key={area}
                                            onClick={() => form.setData('target_performance_area', area)}
                                        >
                                            {area}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex items-end gap-2 md:col-span-2">
                            <Button type="submit" disabled={form.processing}>
                                {editingSeminarId === null ? 'Add Suggestion' : 'Update Suggestion'}
                            </Button>
                            {editingSeminarId !== null && (
                                <Button type="button" variant="outline" onClick={cancelEdit}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#2F5E2B] text-center text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                    <TableHead>Administrative Service Focus Area</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {seminars.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No training suggestions found.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {paginatedSeminars.map((seminar, index) => (
                                    <TableRow
                                        key={seminar.id}
                                        style={{ animationDelay: `${index * 26}ms` }}
                                        className={`text-sm font-semibold text-foreground ${
                                            index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'
                                        } animate-fade-in-up`}
                                    >
                                        <TableCell>{seminar.target_performance_area}</TableCell>
                                        <TableCell>{seminar.description}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => editSeminar(seminar)}>
                                                    Update
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={form.processing}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>Confirm Removal</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to remove this training suggestion?
                                                        </DialogDescription>
                                                        <DialogFooter className="gap-2">
                                                            <DialogClose asChild>
                                                                <Button variant="secondary" type="button">
                                                                    Keep
                                                                </Button>
                                                            </DialogClose>
                                                            <DialogClose asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    onClick={() => deleteSeminar(seminar.id)}
                                                                    disabled={form.processing}
                                                                >
                                                                    Yes, Remove
                                                                </Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                                    <TableCell colSpan={3}>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="flex items-center gap-2">
                                                <span>Rows per page</span>
                                                <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
                                                    <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]" id="seminars-rows-per-page">
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

                                            <div className="flex items-center gap-4">
                                                <span>
                                                    Page {currentPage} of {totalPages}
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
                                                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                            />
                                                        </PaginationItem>
                                                        <PaginationItem>
                                                            <PaginationNext
                                                                href="#"
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    goToNextPage();
                                                                }}
                                                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
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
            </div>
        </>
    );
};
