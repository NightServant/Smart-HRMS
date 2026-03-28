import { router, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Pencil,
    Plus,
    Power,
    Search,
    ShieldPlus,
    UserCog,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import * as admin from '@/routes/admin';

type ManagedUser = {
    name: string;
    email: string;
    role: string;
    employeeId?: string | null;
    position?: string | null;
    twoFactorEnabled: boolean;
    isActive: boolean;
    createdAt?: string | null;
    links: {
        update: string;
        activate: string;
        deactivate: string;
    };
};

type Filters = {
    search: string;
    role: string;
    status: string;
    twoFactor: string;
    sort: 'name' | 'email' | 'role' | 'created_at';
    direction: 'asc' | 'desc';
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type PageProps = {
    auth: {
        user: {
            email: string;
        };
    };
    errors: Record<string, string>;
};

type UserFormState = {
    name: string;
    email: string;
    role: string;
    employee_id: string;
    password: string;
    password_confirmation: string;
    is_active: boolean;
};

const emptyForm: UserFormState = {
    name: '',
    email: '',
    role: 'employee',
    employee_id: '',
    password: '',
    password_confirmation: '',
    is_active: true,
};

export function AdminUserManagementTable({
    users,
    roles,
    filters,
    pagination,
}: {
    users: ManagedUser[];
    roles: string[];
    filters: Filters;
    pagination: PaginationMeta;
}) {
    const { auth, errors } = usePage<PageProps>().props;
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [twoFactorFilter, setTwoFactorFilter] = useState(
        filters.twoFactor || 'all',
    );
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [createForm, setCreateForm] = useState<UserFormState>(emptyForm);
    const [editForm, setEditForm] = useState<UserFormState>(emptyForm);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

    const visit = (
        params: Partial<Filters> & { page?: number; perPage?: number },
    ): void => {
        router.get(
            admin.userManagement().url,
            {
                search: params.search ?? searchTerm,
                role:
                    (params.role ?? roleFilter) === 'all'
                        ? ''
                        : (params.role ?? roleFilter),
                status:
                    (params.status ?? statusFilter) === 'all'
                        ? ''
                        : (params.status ?? statusFilter),
                twoFactor:
                    (params.twoFactor ?? twoFactorFilter) === 'all'
                        ? ''
                        : (params.twoFactor ?? twoFactorFilter),
                sort: params.sort ?? filters.sort,
                direction: params.direction ?? filters.direction,
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? pagination.perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['users', 'filters', 'pagination', 'roles'],
            },
        );
    };

    const handleSortChange = (column: Filters['sort']): void => {
        const nextDirection =
            filters.sort === column && filters.direction === 'asc'
                ? 'desc'
                : 'asc';

        visit({ sort: column, direction: nextDirection, page: 1 });
    };

    const renderSortIcon = (column: Filters['sort']) => {
        if (filters.sort !== column) {
            return <ArrowUpDown className="size-4" />;
        }

        return filters.direction === 'asc' ? (
            <ArrowUp className="size-4" />
        ) : (
            <ArrowDown className="size-4" />
        );
    };

    const openCreateDialog = (): void => {
        setCreateForm(emptyForm);
        setIsCreateOpen(true);
    };

    const openEditDialog = (user: ManagedUser): void => {
        setSelectedUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            role: user.role,
            employee_id: user.employeeId ?? '',
            password: '',
            password_confirmation: '',
            is_active: user.isActive,
        });
        setIsEditOpen(true);
    };

    const submitCreate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        router.post('/admin/user-management', createForm, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('User account created successfully.');
                setIsCreateOpen(false);
                setCreateForm(emptyForm);
            },
        });
    };

    const submitUpdate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (!selectedUser) {
            return;
        }

        router.put(selectedUser.links.update, editForm, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('User account updated successfully.');
                setIsEditOpen(false);
                setSelectedUser(null);
            },
        });
    };

    const triggerAccountAction = (url: string, message: string): void => {
        router.post(
            url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(message),
            },
        );
    };

    return (
        <>
            <div className="top-0 animate-slide-in-down">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <ShieldPlus className="h-8 w-8" />
                            User Management
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Manage all Smart HRMS accounts, roles, and account
                            access from one place.
                        </p>
                    </div>
                    <Button type="button" onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Account
                    </Button>
                </div>
            </div>

            <div className="glass-card mx-auto w-full animate-zoom-in-soft rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="grid gap-4 py-6 lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]">
                    <div className="relative w-full lg:col-span-3 xl:col-span-1 xl:max-w-md">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                visit({ search: event.target.value, page: 1 });
                            }}
                            className="pl-9"
                            placeholder="Search name, email, or employee ID..."
                        />
                    </div>
                    <Select
                        value={roleFilter}
                        onValueChange={(value) => {
                            setRoleFilter(value);
                            visit({ role: value, page: 1 });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">All roles</SelectItem>
                                {roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setStatusFilter(value);
                            visit({ status: value, page: 1 });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">All status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Select
                        value={twoFactorFilter}
                        onValueChange={(value) => {
                            setTwoFactorFilter(value);
                            visit({ twoFactor: value, page: 1 });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="2FA" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">All 2FA</SelectItem>
                                <SelectItem value="enabled">Enabled</SelectItem>
                                <SelectItem value="disabled">
                                    Disabled
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
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
                                    Email
                                    {renderSortIcon('email')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSortChange('role')}
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Role
                                    {renderSortIcon('role')}
                                </Button>
                            </TableHead>
                            <TableHead>Employee Link</TableHead>
                            <TableHead>2FA</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handleSortChange('created_at')
                                    }
                                    className="h-auto px-0 text-white hover:bg-transparent hover:text-white"
                                >
                                    Created
                                    {renderSortIcon('created_at')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user, index) => (
                            <TableRow
                                key={`${user.email}-${index}`}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}`}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        {user.position && (
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {user.position}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="capitalize">
                                    {user.role.replace('-', ' ')}
                                </TableCell>
                                <TableCell>
                                    {user.employeeId ?? 'Not linked'}
                                </TableCell>
                                <TableCell>
                                    {user.twoFactorEnabled
                                        ? 'Enabled'
                                        : 'Disabled'}
                                </TableCell>
                                <TableCell>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </TableCell>
                                <TableCell>{user.createdAt ?? '-'}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Pencil className="mr-2 size-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                user.isActive
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                triggerAccountAction(
                                                    user.isActive
                                                        ? user.links.deactivate
                                                        : user.links.activate,
                                                    user.isActive
                                                        ? 'User account deactivated successfully.'
                                                        : 'User account activated successfully.',
                                                )
                                            }
                                            disabled={
                                                user.email ===
                                                    auth.user.email &&
                                                user.isActive
                                            }
                                        >
                                            <Power className="mr-2 size-4" />
                                            {user.isActive
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80"
                                >
                                    No matching accounts found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-[#E8F4E4] text-sm font-semibold text-foreground dark:bg-[#1A2F1A] dark:text-[#EAF7E6]">
                            <TableCell colSpan={8}>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>Rows per page</span>
                                        <Select
                                            value={String(pagination.perPage)}
                                            onValueChange={(value) =>
                                                visit({
                                                    perPage: Number(value),
                                                    page: 1,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-20 bg-white/80 dark:border-[#4A7C3C] dark:bg-[#274827] dark:text-[#EAF7E6]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent align="start">
                                                <SelectGroup>
                                                    <SelectItem value="5">
                                                        5
                                                    </SelectItem>
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

                                    <div className="flex items-center gap-4 self-end md:self-auto">
                                        <span>
                                            Page {pagination.currentPage} of{' '}
                                            {pagination.lastPage}
                                        </span>
                                        <Pagination className="mx-0 w-auto">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            if (
                                                                pagination.currentPage >
                                                                1
                                                            ) {
                                                                visit({
                                                                    page:
                                                                        pagination.currentPage -
                                                                        1,
                                                                });
                                                            }
                                                        }}
                                                        className={
                                                            pagination.currentPage ===
                                                            1
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
                                                            if (
                                                                pagination.currentPage <
                                                                pagination.lastPage
                                                            ) {
                                                                visit({
                                                                    page:
                                                                        pagination.currentPage +
                                                                        1,
                                                                });
                                                            }
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
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Account</DialogTitle>
                        <DialogDescription>
                            Create a new Smart HRMS account and assign its role
                            and access state.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={submitCreate}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create-name">Name</Label>
                                <Input
                                    id="create-name"
                                    value={createForm.name}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={createForm.email}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            email: event.target.value,
                                        }))
                                    }
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-role">Role</Label>
                                <Select
                                    value={createForm.role}
                                    onValueChange={(value) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            role: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="create-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {roles.map((role) => (
                                                <SelectItem
                                                    key={role}
                                                    value={role}
                                                >
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="text-sm text-destructive">
                                        {errors.role}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-employee-id">
                                    Employee ID
                                </Label>
                                <Input
                                    id="create-employee-id"
                                    value={createForm.employee_id}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            employee_id: event.target.value,
                                        }))
                                    }
                                    placeholder="Optional employee link"
                                />
                                {errors.employee_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.employee_id}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-password">
                                    Password
                                </Label>
                                <Input
                                    id="create-password"
                                    type="password"
                                    value={createForm.password}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            password: event.target.value,
                                        }))
                                    }
                                />
                                {errors.password && (
                                    <p className="text-sm text-destructive">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-password-confirmation">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="create-password-confirmation"
                                    type="password"
                                    value={createForm.password_confirmation}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            password_confirmation:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={createForm.is_active}
                                onCheckedChange={(checked) =>
                                    setCreateForm((current) => ({
                                        ...current,
                                        is_active: checked === true,
                                    }))
                                }
                            />
                            <Label>Account starts as active</Label>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                <UserCog className="mr-2 size-4" />
                                Create Account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Account</DialogTitle>
                        <DialogDescription>
                            Update role, employee link, and account state
                            without exposing the internal user ID.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={submitUpdate}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            email: event.target.value,
                                        }))
                                    }
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select
                                    value={editForm.role}
                                    onValueChange={(value) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            role: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="edit-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {roles.map((role) => (
                                                <SelectItem
                                                    key={role}
                                                    value={role}
                                                >
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="text-sm text-destructive">
                                        {errors.role}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-employee-id">
                                    Employee ID
                                </Label>
                                <Input
                                    id="edit-employee-id"
                                    value={editForm.employee_id}
                                    onChange={(event) =>
                                        setEditForm((current) => ({
                                            ...current,
                                            employee_id: event.target.value,
                                        }))
                                    }
                                />
                                {errors.employee_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.employee_id}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={editForm.is_active}
                                onCheckedChange={(checked) =>
                                    setEditForm((current) => ({
                                        ...current,
                                        is_active: checked === true,
                                    }))
                                }
                            />
                            <Label>Account is active</Label>
                        </div>
                        {errors.is_active && (
                            <p className="text-sm text-destructive">
                                {errors.is_active}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Pencil className="mr-2 size-4" />
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
