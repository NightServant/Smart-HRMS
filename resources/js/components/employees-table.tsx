import { router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserCog,
    UserSearch,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import PageIntro from '@/components/page-intro';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const CREATE_DEPARTMENT_VALUE = '__create_department__';

type Employee = {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: string;
    employee_id: string;
    department_id: number | null;
    department: string;
    position_id: number | null;
    position: string;
    employment_status: string;
    date_hired: string;
    zkteco_pin: string | null;
    performance_rating?: string | null;
    remarks?: string | null;
    notification?: string | null;
    account_is_active: boolean;
    account_two_factor_enabled: boolean;
    account_created_at?: string | null;
    account_links: {
        update: string;
        activate: string;
        deactivate: string;
        password_reset: string;
    };
};

type Option = {
    id: number;
    name: string;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type EmployeeSortKey =
    | 'employee_id'
    | 'name'
    | 'email'
    | 'department'
    | 'position';
type SortDirection = 'asc' | 'desc';

type DepartmentMode = 'existing' | 'new';

type StoreForm = {
    name: string;
    email: string;
    department_mode: DepartmentMode;
    department_id: string;
    department_name: string;
    position_id: string;
    employment_status: string;
    date_hired: string;
};

type UpdateForm = StoreForm & {
    zkteco_pin: string;
};

type ManageAccountForm = {
    name: string;
    email: string;
    role: string;
    employee_id: string;
    password: string;
    password_confirmation: string;
    is_active: boolean;
};

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

function AccountStatusBadge({
    isActive,
}: {
    isActive: boolean;
}) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'}`}
        >
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );
}

function formatRoleLabel(role: string): string {
    if (role === 'hr-personnel') {
        return 'HR Personnel';
    }

    if (role === 'pmt') {
        return 'PMT';
    }

    return role
        .replace('-', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function DepartmentFields<TForm extends { department_mode: DepartmentMode; department_id: string; department_name: string }>({
    departments,
    data,
    setData,
    errors,
    idPrefix,
}: {
    departments: Option[];
    data: TForm;
    setData: (key: keyof TForm, value: string) => void;
    errors: Record<string, string>;
    idPrefix: 'add' | 'edit';
}) {
    const isCreatingDepartment = data.department_mode === 'new';
    const selectValue = isCreatingDepartment
        ? CREATE_DEPARTMENT_VALUE
        : data.department_id || '';

    return (
        <>
            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-department`}>Department</Label>
                <Select
                    value={selectValue}
                onValueChange={(value) => {
                        if (value === CREATE_DEPARTMENT_VALUE) {
                            setData('department_mode', 'new');
                            setData('department_id', '');
                            return;
                        }

                        setData('department_mode', 'existing');
                        setData('department_id', value);
                        setData('department_name', '');
                    }}
                >
                    <SelectTrigger id={`${idPrefix}-department`}>
                        <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {departments.map((department) => (
                                <SelectItem
                                    key={department.id}
                                    value={String(department.id)}
                                >
                                    {department.name}
                                </SelectItem>
                            ))}
                            <SelectItem value={CREATE_DEPARTMENT_VALUE}>
                                Add new department
                            </SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {errors.department_id && (
                    <p className="text-xs text-destructive">
                        {errors.department_id}
                    </p>
                )}
            </div>

            {isCreatingDepartment && (
                <div className="grid gap-1.5">
                    <Label htmlFor={`${idPrefix}-department-name`}>
                        New Department Name
                    </Label>
                    <Input
                        id={`${idPrefix}-department-name`}
                        value={data.department_name}
                        onChange={(event) => setData('department_name', event.target.value)}
                        placeholder="Administrative Office"
                    />
                    {errors.department_name && (
                        <p className="text-xs text-destructive">
                            {errors.department_name}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

function PositionField<TForm extends { position_id: string }>({
    positions,
    data,
    setData,
    errors,
    idPrefix,
}: {
    positions: Option[];
    data: TForm;
    setData: (key: keyof TForm, value: string) => void;
    errors: Record<string, string>;
    idPrefix: 'add' | 'edit';
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-position`}>Position</Label>
            <Select
                value={data.position_id}
                onValueChange={(value) => setData('position_id', value)}
            >
                <SelectTrigger id={`${idPrefix}-position`}>
                    <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {positions.map((position) => (
                            <SelectItem
                                key={position.id}
                                value={String(position.id)}
                            >
                                {position.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            {errors.position_id && (
                <p className="text-xs text-destructive">
                    {errors.position_id}
                </p>
            )}
        </div>
    );
}

function AddEmployeeDialog({
    open,
    onOpenChange,
    nextEmployeeId,
    departments,
    positions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nextEmployeeId: string;
    departments: Option[];
    positions: Option[];
}) {
    const { data, setData, post, processing, errors, reset } =
        useForm<StoreForm>({
            name: '',
            email: '',
            department_mode: 'existing',
            department_id: '',
            department_name: '',
            position_id: '',
            employment_status: 'regular',
            date_hired: '',
        });

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();
        post(employeeDirectoryRoutes.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            reset();
        }

        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Employee</DialogTitle>
                    <DialogDescription>
                        Create a new employee record, provision a user account,
                        and email the employee their temporary password.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="add-name">Full Name</Label>
                            <Input
                                id="add-name"
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
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
                                onChange={(event) =>
                                    setData('email', event.target.value)
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
                                value={nextEmployeeId}
                                readOnly
                                className="bg-muted/35"
                            />
                            <p className="text-xs text-muted-foreground">
                                Generated automatically when the employee is
                                saved.
                            </p>
                        </div>

                        <DepartmentFields
                            departments={departments}
                            data={data}
                            setData={setData}
                            errors={errors}
                            idPrefix="add"
                        />

                        <PositionField
                            positions={positions}
                            data={data}
                            setData={setData}
                            errors={errors}
                            idPrefix="add"
                        />

                        <div className="grid gap-1.5">
                            <Label htmlFor="add-employment-status">
                                Employment Status
                            </Label>
                            <Select
                                value={data.employment_status}
                                onValueChange={(value) =>
                                    setData('employment_status', value)
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
                                onChange={(event) =>
                                    setData('date_hired', event.target.value)
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
    departments,
    positions,
}: {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    departments: Option[];
    positions: Option[];
}) {
    const { data, setData, put, processing, errors, reset } =
        useForm<UpdateForm>({
            name: '',
            email: '',
            department_mode: 'existing',
            department_id: '',
            department_name: '',
            position_id: '',
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
            department_mode: employee.department_id ? 'existing' : 'new',
            department_id: employee.department_id
                ? String(employee.department_id)
                : '',
            department_name: employee.department_id ? '' : employee.department,
            position_id: employee.position_id ? String(employee.position_id) : '',
            employment_status: employee.employment_status,
            date_hired: employee.date_hired,
            zkteco_pin: employee.zkteco_pin ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee?.employee_id]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            reset();
        }

        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();

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
                                onChange={(event) =>
                                    setData('name', event.target.value)
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
                                onChange={(event) =>
                                    setData('email', event.target.value)
                                }
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <DepartmentFields
                            departments={departments}
                            data={data}
                            setData={setData}
                            errors={errors}
                            idPrefix="edit"
                        />

                        <PositionField
                            positions={positions}
                            data={data}
                            setData={setData}
                            errors={errors}
                            idPrefix="edit"
                        />

                        <div className="grid gap-1.5">
                            <Label htmlFor="edit-employment-status">
                                Employment Status
                            </Label>
                            <Select
                                value={data.employment_status}
                                onValueChange={(value) =>
                                    setData('employment_status', value)
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
                                onChange={(event) =>
                                    setData('date_hired', event.target.value)
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
                                ZKTeco Person ID{' '}
                                <span className="font-normal text-muted-foreground">
                                    (from ZKBio Zlink Person ID column)
                                </span>
                            </Label>
                            <Input
                                id="edit-zkteco-pin"
                                type="text"
                                placeholder="e.g. EMP002 or 229532"
                                value={data.zkteco_pin}
                                onChange={(event) =>
                                    setData('zkteco_pin', event.target.value)
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

function ManageEmployeeAccountDialog({
    employee,
    open,
    onOpenChange,
    accountRoles,
}: {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountRoles: string[];
}) {
    const { data, setData, put, processing, errors, reset } =
        useForm<ManageAccountForm>({
            name: '',
            email: '',
            role: 'employee',
            employee_id: '',
            password: '',
            password_confirmation: '',
            is_active: true,
        });

    useEffect(() => {
        if (!open || employee === null) {
            return;
        }

        setData({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            employee_id: employee.employee_id,
            password: '',
            password_confirmation: '',
            is_active: employee.account_is_active,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee?.user_id]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            reset();
        }

        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();

        if (!employee) {
            return;
        }

        put(employee.account_links.update, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    const sendPasswordReset = (): void => {
        if (!employee) {
            return;
        }

        router.post(
            employee.account_links.password_reset,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Linked Account</DialogTitle>
                    <DialogDescription>
                        Update account access for {employee?.name ?? 'employee'}
                        . If the role changes away from employee, the account
                        will move to Operational Accounts after saving.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="account-name">Name</Label>
                            <Input
                                id="account-name"
                                value={data.name}
                                readOnly
                                className="bg-muted/35"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="account-employee-id">
                                Employee ID
                            </Label>
                            <Input
                                id="account-employee-id"
                                value={data.employee_id}
                                readOnly
                                className="bg-muted/35"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="account-email">Email Address</Label>
                            <Input
                                id="account-email"
                                type="email"
                                value={data.email}
                                onChange={(event) =>
                                    setData('email', event.target.value)
                                }
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="account-role">Account Role</Label>
                            <Select
                                value={data.role}
                                onValueChange={(value) =>
                                    setData('role', value)
                                }
                            >
                                <SelectTrigger id="account-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {accountRoles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {formatRoleLabel(role)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors.role && (
                                <p className="text-xs text-destructive">
                                    {errors.role}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
                        <p>
                            Two-factor authentication:{' '}
                            <span className="font-semibold text-foreground">
                                {employee?.account_two_factor_enabled
                                    ? 'Enabled'
                                    : 'Disabled'}
                            </span>
                        </p>
                        <p>
                            Account created:{' '}
                            <span className="font-semibold text-foreground">
                                {employee?.account_created_at ?? '-'}
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Checkbox
                            checked={data.is_active}
                            onCheckedChange={(checked) =>
                                setData('is_active', checked === true)
                            }
                        />
                        <Label>Account is active</Label>
                    </div>
                    {errors.is_active && (
                        <p className="text-xs text-destructive">
                            {errors.is_active}
                        </p>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={sendPasswordReset}
                        >
                            Send Password Reset
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Account'}
                            </Button>
                        </div>
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
    nextEmployeeId,
    departments,
    positions = [],
    statusFilter = '',
    positionFilter = '',
    accountRoles = [],
}: {
    employees: Employee[];
    search: string;
    sort: EmployeeSortKey;
    direction: SortDirection;
    pagination: PaginationMeta;
    nextEmployeeId: string;
    departments: Option[];
    positions?: Option[];
    statusFilter?: string;
    positionFilter?: string;
    accountRoles?: string[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [searchTerm, setSearchTerm] = useState(search);
    const [currentStatusFilter, setCurrentStatusFilter] =
        useState(statusFilter);
    const [currentPositionFilter, setCurrentPositionFilter] =
        useState(positionFilter);
    const [isPredictiveModalOpen, setIsPredictiveModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null,
    );
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);
    const [crudEmployee, setCrudEmployee] = useState<Employee | null>(null);

    const canManageEmployees = auth.user.role === 'hr-personnel';

    const buildMergedQuery = (
        overrides: Record<string, string | number>,
    ): Record<string, string | number> => {
        if (typeof window === 'undefined') {
            return overrides;
        }

        const currentQuery = Object.fromEntries(
            new URLSearchParams(window.location.search).entries(),
        );

        return {
            ...currentQuery,
            ...overrides,
        };
    };

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
            buildMergedQuery({
                search: params.search ?? searchTerm,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
                sort: params.sort ?? sort,
                direction: params.direction ?? direction,
                statusFilter: params.statusFilter ?? currentStatusFilter,
                positionFilter: params.positionFilter ?? currentPositionFilter,
            }),
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
                    'departments',
                    'positions',
                    'nextEmployeeId',
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

    const openEditDialog = (employee: Employee): void => {
        setCrudEmployee(employee);
        setIsEditOpen(true);
    };

    const openDeleteDialog = (employee: Employee): void => {
        setCrudEmployee(employee);
        setIsDeleteOpen(true);
    };

    const openManageAccountDialog = (employee: Employee): void => {
        setCrudEmployee(employee);
        setIsManageAccountOpen(true);
    };

    const colSpan = canManageEmployees ? 10 : 8;

    return (
        <>
            <PageIntro
                eyebrow={`${auth.user.role === 'hr-personnel' ? 'HR Personnel' : 'Evaluator'} · Employee Directory`}
                title="Employee Data Management"
                description="Manage employee records, linked accounts, departments, and role-aligned position data."
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
                                    {positions.map((position) => (
                                        <SelectItem
                                            key={position.id}
                                            value={position.name}
                                        >
                                            {position.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Table className="w-full min-w-[84rem]">
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
                                    onClick={() =>
                                        handleSortChange('department')
                                    }
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Department
                                    {renderSortIcon('department')}
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
                            <TableHead>Date Hired</TableHead>
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
                                <TableCell>{employee.department || '—'}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>
                                    <StatusBadge
                                        status={employee.employment_status}
                                    />
                                </TableCell>
                                <TableCell>{employee.date_hired || '—'}</TableCell>
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
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1.5 px-2"
                                                onClick={() =>
                                                    openManageAccountDialog(
                                                        employee,
                                                    )
                                                }
                                                title="Manage account"
                                            >
                                                <UserCog className="size-4" />
                                                <span className="hidden sm:inline">
                                                    Account
                                                </span>
                                            </Button>
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
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            goToNextPage();
                                        }}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </div>

            <AddEmployeeDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                nextEmployeeId={nextEmployeeId}
                departments={departments}
                positions={positions}
            />
            <EditEmployeeDialog
                employee={crudEmployee}
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) {
                        setCrudEmployee(null);
                    }
                }}
                departments={departments}
                positions={positions}
            />
            <ManageEmployeeAccountDialog
                employee={crudEmployee}
                open={isManageAccountOpen}
                onOpenChange={(open) => {
                    setIsManageAccountOpen(open);
                    if (!open) {
                        setCrudEmployee(null);
                    }
                }}
                accountRoles={accountRoles}
            />
            <DeleteEmployeeDialog
                employee={crudEmployee}
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) {
                        setCrudEmployee(null);
                    }
                }}
            />
            <PredictivePerformanceModule
                isOpen={isPredictiveModalOpen}
                onOpenChange={(open) => {
                    setIsPredictiveModalOpen(open);
                    if (!open) {
                        setSelectedEmployee(null);
                    }
                }}
                employee={
                    selectedEmployee
                        ? {
                              id: selectedEmployee.id,
                              employee_id: selectedEmployee.employee_id,
                              name: selectedEmployee.name,
                              position: selectedEmployee.position,
                              performance_rating:
                                  selectedEmployee.performance_rating,
                              remarks: selectedEmployee.remarks,
                              notification: selectedEmployee.notification,
                          }
                        : null
                }
            />
        </>
    );
}
