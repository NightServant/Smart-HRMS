import { router, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Pencil,
    Plus,
    Power,
    Search,
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import * as admin from '@/routes/admin';
import * as userManagementRoutes from '@/routes/admin/user-management';

type OperationalAccount = {
    id: number;
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
        passwordReset: string;
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

type AccountFormState = {
    name: string;
    email: string;
    role: string;
    employee_id: string;
    password: string;
    password_confirmation: string;
    is_active: boolean;
};

function formatRoleLabel(role: string): string {
    if (role === 'hr-personnel') {
        return 'HR Personnel';
    }

    if (role === 'pmt') {
        return 'PMT';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
}

export function OperationalAccountsPanel({
    accounts,
    roles,
    filters,
    pagination,
}: {
    accounts: OperationalAccount[];
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
    const [selectedAccount, setSelectedAccount] =
        useState<OperationalAccount | null>(null);
    const [createForm, setCreateForm] = useState<AccountFormState>({
        name: '',
        email: '',
        role: roles[0] ?? 'hr-personnel',
        employee_id: '',
        password: '',
        password_confirmation: '',
        is_active: true,
    });
    const [editForm, setEditForm] = useState<AccountFormState>({
        name: '',
        email: '',
        role: roles[0] ?? 'hr-personnel',
        employee_id: '',
        password: '',
        password_confirmation: '',
        is_active: true,
    });

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

    const visit = (
        params: Partial<Filters> & { page?: number; perPage?: number },
    ): void => {
        router.get(
            admin.employeeDirectory().url,
            buildMergedQuery({
                accountSearch: params.search ?? searchTerm,
                accountRole:
                    (params.role ?? roleFilter) === 'all'
                        ? ''
                        : (params.role ?? roleFilter),
                accountStatus:
                    (params.status ?? statusFilter) === 'all'
                        ? ''
                        : (params.status ?? statusFilter),
                accountTwoFactor:
                    (params.twoFactor ?? twoFactorFilter) === 'all'
                        ? ''
                        : (params.twoFactor ?? twoFactorFilter),
                accountSort: params.sort ?? filters.sort,
                accountDirection: params.direction ?? filters.direction,
                accountPage: params.page ?? pagination.currentPage,
                accountPerPage: params.perPage ?? pagination.perPage,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: [
                    'operationalAccounts',
                    'operationalFilters',
                    'operationalPagination',
                    'operationalRoles',
                ],
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

    const resetCreateForm = (): void => {
        setCreateForm({
            name: '',
            email: '',
            role: roles[0] ?? 'hr-personnel',
            employee_id: '',
            password: '',
            password_confirmation: '',
            is_active: true,
        });
    };

    const openEditDialog = (account: OperationalAccount): void => {
        setSelectedAccount(account);
        setEditForm({
            name: account.name,
            email: account.email,
            role: account.role,
            employee_id: account.employeeId ?? '',
            password: '',
            password_confirmation: '',
            is_active: account.isActive,
        });
        setIsEditOpen(true);
    };

    const submitCreate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        router.post(userManagementRoutes.store().url, createForm, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Operational account created successfully.');
                resetCreateForm();
                setIsCreateOpen(false);
            },
        });
    };

    const submitUpdate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (!selectedAccount) {
            return;
        }

        router.put(selectedAccount.links.update, editForm, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Operational account updated successfully.');
                setSelectedAccount(null);
                setIsEditOpen(false);
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

    const sendPasswordReset = (): void => {
        if (!selectedAccount) {
            return;
        }

        triggerAccountAction(
            selectedAccount.links.passwordReset,
            'Password reset link sent successfully.',
        );
    };

    return (
        <>
            <section className="glass-card app-data-shell mx-auto flex w-full flex-col gap-5 bg-card px-4 py-5 shadow-sm sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                            Operational Accounts
                        </p>
                        <h2 className="text-xl font-semibold text-foreground">
                            Non-employee account management
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Manage HR and PMT accounts without mixing them into
                            the employee records table.
                        </p>
                    </div>
                    <Button type="button" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Create Operational Account
                    </Button>
                </div>

                <div className="grid gap-4 py-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]">
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
                                        {formatRoleLabel(role)}
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
                                <SelectItem value="inactive">Inactive</SelectItem>
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
                                <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <Table className="w-full min-w-[78rem]">
                    <TableHeader>
                        <TableRow className="app-table-head-row text-sm font-bold">
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
                                    onClick={() => handleSortChange('created_at')}
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
                        {accounts.map((account, index) => (
                            <TableRow
                                key={`${account.id}-${account.email}`}
                                style={{ animationDelay: `${index * 24}ms` }}
                                className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{account.name}</span>
                                        {account.position && (
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {account.position}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{account.email}</TableCell>
                                <TableCell>
                                    {formatRoleLabel(account.role)}
                                </TableCell>
                                <TableCell>
                                    {account.employeeId ?? 'Not linked'}
                                </TableCell>
                                <TableCell>
                                    {account.twoFactorEnabled
                                        ? 'Enabled'
                                        : 'Disabled'}
                                </TableCell>
                                <TableCell>
                                    {account.isActive ? 'Active' : 'Inactive'}
                                </TableCell>
                                <TableCell>{account.createdAt ?? '-'}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditDialog(account)}
                                        >
                                            <Pencil className="mr-2 size-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                account.isActive
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                triggerAccountAction(
                                                    account.isActive
                                                        ? account.links.deactivate
                                                        : account.links.activate,
                                                    account.isActive
                                                        ? 'Operational account deactivated successfully.'
                                                        : 'Operational account activated successfully.',
                                                )
                                            }
                                            disabled={
                                                account.email === auth.user.email &&
                                                account.isActive
                                            }
                                        >
                                            <Power className="mr-2 size-4" />
                                            {account.isActive
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {accounts.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80"
                                >
                                    No matching operational accounts found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="app-table-pagination-bar">
                    <div className="app-table-pagination-shell">
                        <div className="app-table-pagination-page-size">
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
                                                if (pagination.currentPage > 1) {
                                                    visit({
                                                        page:
                                                            pagination.currentPage -
                                                            1,
                                                    });
                                                }
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
                </div>
            </section>

            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);

                    if (!open) {
                        resetCreateForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create operational account</DialogTitle>
                        <DialogDescription>
                            Create a specialized account for HR personnel or
                            PMT access.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={submitCreate}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create-ops-name">Name</Label>
                                <Input
                                    id="create-ops-name"
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
                                <Label htmlFor="create-ops-email">Email</Label>
                                <Input
                                    id="create-ops-email"
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
                                <Label htmlFor="create-ops-role">Role</Label>
                                <Select
                                    value={createForm.role}
                                    onValueChange={(value) =>
                                        setCreateForm((current) => ({
                                            ...current,
                                            role: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="create-ops-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {roles.map((role) => (
                                                <SelectItem
                                                    key={role}
                                                    value={role}
                                                >
                                                    {formatRoleLabel(role)}
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
                                <Label htmlFor="create-ops-employee-id">
                                    Employee ID
                                </Label>
                                <Input
                                    id="create-ops-employee-id"
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
                                <Label htmlFor="create-ops-password">
                                    Password
                                </Label>
                                <Input
                                    id="create-ops-password"
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
                                <Label htmlFor="create-ops-password-confirmation">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="create-ops-password-confirmation"
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

            <Dialog
                open={isEditOpen}
                onOpenChange={(open) => {
                    setIsEditOpen(open);

                    if (!open) {
                        setSelectedAccount(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit operational account</DialogTitle>
                        <DialogDescription>
                            Update account details, employee link, and account
                            state from the shared HR workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={submitUpdate}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-ops-name">Name</Label>
                                <Input
                                    id="edit-ops-name"
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
                                <Label htmlFor="edit-ops-email">Email</Label>
                                <Input
                                    id="edit-ops-email"
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
                                <Label htmlFor="edit-ops-employee-id">
                                    Employee ID
                                </Label>
                                <Input
                                    id="edit-ops-employee-id"
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
                        <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
                            <p>
                                Role:{' '}
                                <span className="font-semibold text-foreground">
                                    {formatRoleLabel(
                                        selectedAccount?.role ?? '',
                                    )}
                                </span>
                            </p>
                            <p>
                                Two-factor authentication:{' '}
                                <span className="font-semibold text-foreground">
                                    {selectedAccount?.twoFactorEnabled
                                        ? 'Enabled'
                                        : 'Disabled'}
                                </span>
                            </p>
                            <p>
                                Created:{' '}
                                <span className="font-semibold text-foreground">
                                    {selectedAccount?.createdAt ?? '-'}
                                </span>
                            </p>
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
                                    onClick={() => setIsEditOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    <Pencil className="mr-2 size-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
