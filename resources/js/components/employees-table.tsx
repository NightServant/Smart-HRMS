import { router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserSearch,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PageIntro from '@/components/page-intro';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import * as admin from '@/routes/admin';
import employeeDirectoryRoutes from '@/routes/admin/employee-directory';
import type { Auth } from '@/types';
import PredictivePerformanceModule from './predict-performance-eval-modal';

type Employee = {
    id: number;
    name: string;
    email: string;
    role: string;
    employee_id: string;
    position: string;
    employment_status: string;
    date_hired: string;
    zkteco_pin: number | null;
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

type EmployeeSortKey = 'employee_id' | 'name' | 'email' | 'position';
type SortDirection = 'asc' | 'desc';

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        regular:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        casual: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        job_order:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };

    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? colors.regular}`}
        >
            {formatStatus(status)}
        </span>
    );
}

type StoreForm = {
    name: string;
    email: string;
    employee_id: string;
    job_title: string;
    employment_status: string;
    date_hired: string;
};

type UpdateForm = {
    name: string;
    email: string;
    job_title: string;
    employment_status: string;
    date_hired: string;
    zkteco_pin: string;
};

function AddEmployeeDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data, setData, post, processing, errors, reset } =
        useForm<StoreForm>({
            name: '',
            email: '',
            employee_id: '',
            job_title: '',
            employment_status: 'regular',
            date_hired: '',
        });

    const handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        post(employeeDirectoryRoutes.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Employee</DialogTitle>
                    <DialogDescription>
                        Create a new employee record and user account.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-name">Full Name</Label>
                            <Input
                                id="add-name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="Juan Dela Cruz"
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-email">Email Address</Label>
                            <Input
                                id="add-email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                placeholder="juan@example.com"
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-employee-id">Employee ID</Label>
                            <Input
                                id="add-employee-id"
                                value={data.employee_id}
                                onChange={(e) =>
                                    setData('employee_id', e.target.value)
                                }
                                placeholder="EMP-001"
                            />
                            {errors.employee_id && (
                                <p className="text-xs text-destructive">
                                    {errors.employee_id}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-job-title">Position</Label>
                            <Input
                                id="add-job-title"
                                value={data.job_title}
                                onChange={(e) =>
                                    setData('job_title', e.target.value)
                                }
                                placeholder="Administrative Aide"
                            />
                            {errors.job_title && (
                                <p className="text-xs text-destructive">
                                    {errors.job_title}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-employment-status">
                                Employment Status
                            </Label>
                            <Select
                                value={data.employment_status}
                                onValueChange={(v) =>
                                    setData('employment_status', v)
                                }
                            >
                                <SelectTrigger id="add-employment-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="regular">
                                            Regular
                                        </SelectItem>
                                        <SelectItem value="casual">
                                            Casual
                                        </SelectItem>
                                        <SelectItem value="job_order">
                                            Job Order
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.employment_status && (
                                <p className="text-xs text-destructive">
                                    {errors.employment_status}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-date-hired">Date Hired</Label>
                            <Input
                                id="add-date-hired"
                                type="date"
                                value={data.date_hired}
                                onChange={(e) =>
                                    setData('date_hired', e.target.value)
                                }
                            />
                            {errors.date_hired && (
                                <p className="text-xs text-destructive">
                                    {errors.date_hired}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Employee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data, setData, put, processing, errors, reset } =
        useForm<UpdateForm>({
            name: '',
            email: '',
            job_title: '',
            employment_status: 'regular',
            date_hired: '',
            zkteco_pin: '',
        });

    useEffect(() => {
        if (!open || employee === null) {
            return;
        }

        setData({
            name: employee.name,
            email: employee.email,
            job_title: employee.position,
            employment_status: employee.employment_status,
            date_hired: employee.date_hired,
            zkteco_pin: employee.zkteco_pin !== null ? String(employee.zkteco_pin) : '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee?.employee_id]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
    };

    const handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        if (!employee) {
            return;
        }

        put(
            employeeDirectoryRoutes.update({
                employee: employee.employee_id,
            }).url,
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update information for {employee?.name ?? 'employee'}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-name">Full Name</Label>
                            <Input
                                id="edit-name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-email">Email Address</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-job-title">Position</Label>
                            <Input
                                id="edit-job-title"
                                value={data.job_title}
                                onChange={(e) =>
                                    setData('job_title', e.target.value)
                                }
                            />
                            {errors.job_title && (
                                <p className="text-xs text-destructive">
                                    {errors.job_title}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-employment-status">
                                Employment Status
                            </Label>
                            <Select
                                value={data.employment_status}
                                onValueChange={(v) =>
                                    setData('employment_status', v)
                                }
                            >
                                <SelectTrigger id="edit-employment-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="regular">
                                            Regular
                                        </SelectItem>
                                        <SelectItem value="casual">
                                            Casual
                                        </SelectItem>
                                        <SelectItem value="job_order">
                                            Job Order
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.employment_status && (
                                <p className="text-xs text-destructive">
                                    {errors.employment_status}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-date-hired">Date Hired</Label>
                            <Input
                                id="edit-date-hired"
                                type="date"
                                value={data.date_hired}
                                onChange={(e) =>
                                    setData('date_hired', e.target.value)
                                }
                            />
                            {errors.date_hired && (
                                <p className="text-xs text-destructive">
                                    {errors.date_hired}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-zkteco-pin">
                                ZKTeco PIN{' '}
                                <span className="font-normal text-muted-foreground">
                                    (biometric device slot, 1–9999999)
                                </span>
                            </Label>
                            <Input
                                id="edit-zkteco-pin"
                                type="number"
                                min={1}
                                max={9999999}
                                placeholder="Leave blank if not enrolled on device"
                                value={data.zkteco_pin}
                                onChange={(e) =>
                                    setData('zkteco_pin', e.target.value)
                                }
                            />
                            {errors.zkteco_pin && (
                                <p className="text-xs text-destructive">
                                    {errors.zkteco_pin}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteEmployeeDialog({
    employee,
    open,
    onOpenChange,
}: {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = (): void => {
        if (!employee) {
            return;
        }

        setProcessing(true);
        router.delete(
            employeeDirectoryRoutes.destroy({
                employee: employee.employee_id,
            }).url,
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Employee</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{' '}
                        <strong>{employee?.name}</strong>? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={processing}
                        onClick={handleConfirm}
                    >
                        {processing ? 'Deleting...' : 'Delete Employee'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function EmployeesTable({
    employees,
    search,
    sort,
    direction,
    pagination,
    positions = [],
    statusFilter = '',
    positionFilter = '',
}: {
    employees: Employee[];
    search: string;
    sort: EmployeeSortKey;
    direction: SortDirection;
    pagination: PaginationMeta;
    positions?: string[];
    statusFilter?: string;
    positionFilter?: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [searchTerm, setSearchTerm] = useState(search);
    const [currentStatusFilter, setCurrentStatusFilter] =
        useState(statusFilter);
    const [currentPositionFilter, setCurrentPositionFilter] =
        useState(positionFilter);
    const [isPredictiveModalOpen, setIsPredictiveModalOpen] = useState(false);
    const [updatingEmployeeId, setUpdatingEmployeeId] = useState<string | null>(
        null,
    );
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null,
    );

    // CRUD dialog state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [crudEmployee, setCrudEmployee] = useState<Employee | null>(null);

    const canManageEmploymentStatus = auth.user.role === 'hr-personnel';
    const canManageEmployees = auth.user.role === 'hr-personnel';

    const visitEmployeesTable = (params: {
        search?: string;
        page?: number;
        perPage?: number;
        sort?: EmployeeSortKey;
        direction?: SortDirection;
        statusFilter?: string;
        positionFilter?: string;
    }): void => {
        router.get(
            admin.employeeDirectory().url,
            {
                search: params.search ?? searchTerm,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
                sort: params.sort ?? sort,
                direction: params.direction ?? direction,
                statusFilter: params.statusFilter ?? currentStatusFilter,
                positionFilter: params.positionFilter ?? currentPositionFilter,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: [
                    'employees',
                    'search',
                    'sort',
                    'direction',
                    'pagination',
                    'stats',
                    'statusFilter',
                    'positionFilter',
                ],
            },
        );
    };

    const renderSortIcon = (column: EmployeeSortKey) => {
        if (sort !== column) {
            return <ArrowUpDown className="size-4" />;
        }

        return direction === 'asc' ? (
            <ArrowUp className="size-4" />
        ) : (
            <ArrowDown className="size-4" />
        );
    };

    const handleSortChange = (column: EmployeeSortKey): void => {
        const nextDirection: SortDirection =
            sort === column && direction === 'asc' ? 'desc' : 'asc';
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

    const handleStatusFilterChange = (value: string): void => {
        const filterValue = value === 'all' ? '' : value;
        setCurrentStatusFilter(filterValue);
        visitEmployeesTable({ statusFilter: filterValue, page: 1 });
    };

    const handlePositionFilterChange = (value: string): void => {
        const filterValue = value === 'all' ? '' : value;
        setCurrentPositionFilter(filterValue);
        visitEmployeesTable({ positionFilter: filterValue, page: 1 });
    };

    const handleRowsPerPageChange = (value: string): void => {
        visitEmployeesTable({ page: 1, perPage: Number(value) });
    };

    const goToPreviousPage = (): void => {
        if (pagination.currentPage <= 1) return;
        visitEmployeesTable({ page: pagination.currentPage - 1 });
    };

    const goToNextPage = (): void => {
        if (pagination.currentPage >= pagination.lastPage) return;
        visitEmployeesTable({ page: pagination.currentPage + 1 });
    };

    const openPredictiveModal = (employee: Employee): void => {
        setSelectedEmployee(employee);
        setIsPredictiveModalOpen(true);
    };

    const handleEmploymentStatusChange = (
        employee: Employee,
        employmentStatus: string,
    ): void => {
        if (employee.employment_status === employmentStatus) {
            return;
        }

        setUpdatingEmployeeId(employee.employee_id);
        router.patch(
            employeeDirectoryRoutes.employmentStatus({
                employee: employee.employee_id,
            }).url,
            { employment_status: employmentStatus },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setUpdatingEmployeeId(null),
            },
        );
    };

    const openEditDialog = (employee: Employee): void => {
        setCrudEmployee(employee);
        setIsEditOpen(true);
    };

    const openDeleteDialog = (employee: Employee): void => {
        setCrudEmployee(employee);
        setIsDeleteOpen(true);
    };

    // Determine column count for empty state colspan
    const colSpan = canManageEmployees ? 7 : 6;

    return (
        <>
            <PageIntro
                eyebrow={`${auth.user.role === 'hr-personnel' ? 'HR Personnel' : 'Evaluator'} · Employee Directory`}
                title="Employee Data Management"
                description="List of all employees working for the administrative office of the government."
                className="animate-slide-in-down"
                actions={
                    <div className="flex items-center gap-3">
                        <span className="app-info-pill">
                            <UserSearch className="size-4 text-primary" />
                            {pagination.total} employee records
                        </span>
                        {canManageEmployees && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsAddOpen(true)}
                                className="flex items-center gap-1.5"
                            >
                                <Plus className="size-4" />
                                Add Employee
                            </Button>
                        )}
                    </div>
                }
            />
            <div className="glass-card app-data-shell mx-auto w-full animate-zoom-in-soft bg-card shadow-sm">
                <div className="app-filter-bar py-2">
                    <div className="relative w-full max-w-sm animate-fade-in-left">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
                    <div className="app-filter-bar__actions items-center">
                        <Select
                            value={currentStatusFilter || 'all'}
                            onValueChange={handleStatusFilterChange}
                        >
                            <SelectTrigger className="w-36 bg-card">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="regular">
                                        Regular
                                    </SelectItem>
                                    <SelectItem value="casual">
                                        Casual
                                    </SelectItem>
                                    <SelectItem value="job_order">
                                        Job Order
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select
                            value={currentPositionFilter || 'all'}
                            onValueChange={handlePositionFilterChange}
                        >
                            <SelectTrigger className="w-52 bg-card">
                                <SelectValue placeholder="All Positions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all">
                                        All Positions
                                    </SelectItem>
                                    {positions.map((pos) => (
                                        <SelectItem key={pos} value={pos}>
                                            {pos}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Table className="w-full min-w-[72rem]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handleSortChange('employee_id')
                                    }
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Employee ID
                                    {renderSortIcon('employee_id')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSortChange('name')}
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Name
                                    {renderSortIcon('name')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSortChange('email')}
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Email Address
                                    {renderSortIcon('email')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSortChange('position')}
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Position
                                    {renderSortIcon('position')}
                                </Button>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Predictive Performance Evaluation
                            </TableHead>
                            {canManageEmployees && (
                                <TableHead className="text-center">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee, index) => (
                            <TableRow
                                key={employee.id}
                                style={{
                                    animationDelay: `${index * 28}ms`,
                                }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                            >
                                <TableCell>{employee.employee_id}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>
                                    {canManageEmploymentStatus ? (
                                        <Select
                                            value={employee.employment_status}
                                            onValueChange={(value) =>
                                                handleEmploymentStatusChange(
                                                    employee,
                                                    value,
                                                )
                                            }
                                            disabled={
                                                updatingEmployeeId ===
                                                employee.employee_id
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-36 border-[#4A7C3C]/30 bg-white/70 text-xs dark:border-[#4A7C3C] dark:bg-[#274827]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="regular">
                                                        Regular
                                                    </SelectItem>
                                                    <SelectItem value="casual">
                                                        Casual
                                                    </SelectItem>
                                                    <SelectItem value="job_order">
                                                        Job Order
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <StatusBadge
                                            status={employee.employment_status}
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            openPredictiveModal(employee)
                                        }
                                        className="mx-auto my-auto w-1/2 rounded-md bg-secondary px-4 py-2 font-bold text-foreground shadow-md transition-opacity hover:opacity-90 hover:shadow-lg"
                                    >
                                        Click here
                                    </Button>
                                </TableCell>
                                {canManageEmployees && (
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="size-8 p-0 hover:text-primary"
                                                onClick={() =>
                                                    openEditDialog(employee)
                                                }
                                                title="Edit employee"
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="size-8 p-0 hover:text-destructive"
                                                onClick={() =>
                                                    openDeleteDialog(employee)
                                                }
                                                title="Delete employee"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={colSpan}
                                    className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80"
                                >
                                    No matching employees found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="app-table-pagination-bar">
                <div className="app-table-pagination-shell">
                    <div className="app-table-pagination-page-size">
                        <span>Rows per page</span>
                        <Select
                            value={String(pagination.perPage)}
                            onValueChange={handleRowsPerPageChange}
                        >
                            <SelectTrigger
                                className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]"
                                id="select-rows-per-page"
                            >
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
            <PredictivePerformanceModule
                isOpen={isPredictiveModalOpen}
                onOpenChange={setIsPredictiveModalOpen}
                employee={selectedEmployee}
            />
            <AddEmployeeDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
            />
            <EditEmployeeDialog
                employee={crudEmployee}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
            <DeleteEmployeeDialog
                employee={crudEmployee}
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
            />
        </>
    );
}
