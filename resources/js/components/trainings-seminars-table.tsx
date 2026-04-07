import { router, useForm } from '@inertiajs/react';
import { CalendarDays, ChevronDown, Megaphone } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Seminar = {
    id: number;
    title: string | null;
    description: string;
    target_performance_area: string;
    rating_tier: string | null;
};

type SeminarFormData = {
    title: string;
    description: string;
    target_performance_area: string;
    rating_tier: string;
};

const initialFormData: SeminarFormData = {
    title: '',
    description: '',
    target_performance_area: '',
    rating_tier: '',
};

const RATING_TIERS = [
    { value: '1-2', label: 'Rating 1–2 — Remedial / Foundational' },
    { value: '3-4', label: 'Rating 3–4 — Proficiency Enhancement' },
    { value: '5', label: 'Rating 5 — Mastery / Leadership' },
] as const;

function ratingTierBadge(tier: string | null) {
    if (tier === '1-2') {
        return (
            <Badge className="border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300">
                1–2 Remedial
            </Badge>
        );
    }
    if (tier === '3-4') {
        return (
            <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                3–4 Proficiency
            </Badge>
        );
    }
    if (tier === '5') {
        return (
            <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                5 Mastery
            </Badge>
        );
    }
    return <span className="text-muted-foreground">—</span>;
}

type Props = {
    seminars: Seminar[];
    performanceAreas: string[];
};

export const TrainingsSeminarsTable = ({ seminars, performanceAreas }: Props) => {
    const [editingSeminarId, setEditingSeminarId] = useState<number | null>(
        null,
    );
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

        const endpoint =
            editingSeminarId === null
                ? '/seminars'
                : `/seminars/${editingSeminarId}`;
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
            title: seminar.title ?? '',
            description: seminar.description,
            target_performance_area: seminar.target_performance_area,
            rating_tier: seminar.rating_tier ?? '',
        });
    };

    const deleteSeminar = (seminarId: number): void => {
        form.delete(`/seminars/${seminarId}`, { preserveScroll: true });
    };

    const cancelEdit = (): void => {
        setEditingSeminarId(null);
        form.reset();
    };

    const notifyEmployees = (): void => {
        setIsNotifying(true);
        router.post(
            '/admin/training-suggestions/notify',
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsNotifying(false),
            },
        );
    };

    const goToPreviousPage = (): void =>
        setCurrentPage((p) => Math.max(1, p - 1));
    const goToNextPage = (): void =>
        setCurrentPage((p) => Math.min(totalPages, p + 1));
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
                            Define training criteria and notify employees to
                            find relevant seminars.
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
                    <h2 className="mb-4 text-lg font-semibold">
                        Training Suggestions List
                    </h2>

                    {/* ── Add / Edit form ── */}
                    <form
                        onSubmit={submitForm}
                        className="animate-fade-in-left mb-6 grid grid-cols-1 gap-3 md:grid-cols-2"
                    >
                        {/* Title */}
                        <div className="space-y-1">
                            <Label htmlFor="seminar-title">
                                Training Title
                            </Label>
                            <Input
                                id="seminar-title"
                                placeholder="e.g. Basic Records Management"
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData('title', e.target.value)
                                }
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Label htmlFor="seminar-description">
                                Description
                            </Label>
                            <Input
                                id="seminar-description"
                                placeholder='e.g. Find a seminar or training related to...'
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                                required
                            />
                        </div>

                        {/* Target Performance Area — populated from DB */}
                        <div className="space-y-1">
                            <Label htmlFor="seminar-target-area">
                                Target Performance Area (IPCR Criterion)
                            </Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        id="seminar-target-area"
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-between text-left font-normal"
                                    >
                                        <span className="truncate">
                                            {form.data.target_performance_area ||
                                                'Select IPCR criterion'}
                                        </span>
                                        <ChevronDown className="ml-2 size-4 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                                    {performanceAreas.map((area) => (
                                        <DropdownMenuItem
                                            key={area}
                                            onClick={() =>
                                                form.setData(
                                                    'target_performance_area',
                                                    area,
                                                )
                                            }
                                            className="whitespace-normal"
                                        >
                                            {area}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Rating Tier */}
                        <div className="space-y-1">
                            <Label htmlFor="seminar-rating-tier">
                                Rating Tier
                            </Label>
                            <Select
                                value={form.data.rating_tier}
                                onValueChange={(v) =>
                                    form.setData('rating_tier', v)
                                }
                            >
                                <SelectTrigger
                                    id="seminar-rating-tier"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Select rating tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {RATING_TIERS.map((t) => (
                                            <SelectItem
                                                key={t.value}
                                                value={t.value}
                                            >
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2 md:col-span-2">
                            <Button
                                type="submit"
                                disabled={form.processing}
                            >
                                {editingSeminarId === null
                                    ? 'Add Suggestion'
                                    : 'Update Suggestion'}
                            </Button>
                            {editingSeminarId !== null && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEdit}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>

                    {/* ── Table ── */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                    <TableHead>Training Title</TableHead>
                                    <TableHead className="w-36">
                                        Rating Tier
                                    </TableHead>
                                    <TableHead className="w-44 text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {seminars.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="text-center text-muted-foreground"
                                        >
                                            No training suggestions found.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {(() => {
                                    // Group paginatedSeminars by target_performance_area
                                    const groups: {
                                        area: string;
                                        items: typeof paginatedSeminars;
                                    }[] = [];
                                    for (const seminar of paginatedSeminars) {
                                        const last = groups[groups.length - 1];
                                        if (
                                            last &&
                                            last.area ===
                                                seminar.target_performance_area
                                        ) {
                                            last.items.push(seminar);
                                        } else {
                                            groups.push({
                                                area: seminar.target_performance_area,
                                                items: [seminar],
                                            });
                                        }
                                    }

                                    return groups.map((group, groupIndex) => (
                                        <>
                                            {/* Criterion group header */}
                                            <TableRow
                                                key={`group-${groupIndex}`}
                                                className="border-t-2 border-[#2F5E2B]/30 bg-[#f0f7ed] dark:border-[#4A7C3C]/40 dark:bg-[#1a3318]/60"
                                            >
                                                <TableCell
                                                    colSpan={3}
                                                    className="py-2 pl-4 text-xs font-semibold tracking-wide text-[#2F5E2B] dark:text-[#7CAF73]"
                                                >
                                                    {group.area}
                                                </TableCell>
                                            </TableRow>

                                            {/* Training rows for this criterion */}
                                            {group.items.map(
                                                (seminar, rowIndex) => (
                                                    <TableRow
                                                        key={seminar.id}
                                                        className={`text-sm font-semibold text-foreground ${
                                                            rowIndex % 2 === 0
                                                                ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80'
                                                                : 'bg-[#BFDDB5] dark:bg-[#274827]/80'
                                                        }`}
                                                    >
                                                        <TableCell className="pl-6">
                                                            <div className="space-y-0.5">
                                                                <p className="font-semibold">
                                                                    {seminar.title ??
                                                                        '—'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {
                                                                        seminar.description
                                                                    }
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {ratingTierBadge(
                                                                seminar.rating_tier,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        editSeminar(
                                                                            seminar,
                                                                        )
                                                                    }
                                                                >
                                                                    Update
                                                                </Button>
                                                                <Dialog>
                                                                    <DialogTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            disabled={
                                                                                form.processing
                                                                            }
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogTitle>
                                                                            Confirm
                                                                            Removal
                                                                        </DialogTitle>
                                                                        <DialogDescription>
                                                                            Are
                                                                            you
                                                                            sure
                                                                            you
                                                                            want
                                                                            to
                                                                            remove
                                                                            this
                                                                            training
                                                                            suggestion?
                                                                        </DialogDescription>
                                                                        <DialogFooter className="gap-2">
                                                                            <DialogClose
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="secondary"
                                                                                    type="button"
                                                                                >
                                                                                    Keep
                                                                                </Button>
                                                                            </DialogClose>
                                                                            <DialogClose
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="destructive"
                                                                                    onClick={() =>
                                                                                        deleteSeminar(
                                                                                            seminar.id,
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        form.processing
                                                                                    }
                                                                                >
                                                                                    Yes,
                                                                                    Remove
                                                                                </Button>
                                                                            </DialogClose>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </>
                                    ));
                                })()}
                            </TableBody>
                        </Table>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="app-table-pagination-bar">
                        <div className="app-table-pagination-shell">
                            <div className="app-table-pagination-page-size">
                                <span>Rows per page</span>
                                <Select
                                    value={String(rowsPerPage)}
                                    onValueChange={handleRowsPerPageChange}
                                >
                                    <SelectTrigger
                                        className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]"
                                        id="seminars-rows-per-page"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        <SelectGroup>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">
                                                10
                                            </SelectItem>
                                            <SelectItem value="25">
                                                25
                                            </SelectItem>
                                            <SelectItem value="50">
                                                50
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="app-table-pagination-controls">
                                <span className="app-table-pagination-status">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Pagination className="app-table-pagination-nav">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToPreviousPage();
                                                }}
                                                className={
                                                    currentPage === 1
                                                        ? 'pointer-events-none opacity-50'
                                                        : ''
                                                }
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToNextPage();
                                                }}
                                                className={
                                                    currentPage === totalPages
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
        </>
    );
};
