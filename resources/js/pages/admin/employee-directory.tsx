import { Head, usePage } from '@inertiajs/react';
import { Briefcase, Clock, Shield, UserSearch, Users } from 'lucide-react';
import { EmployeesTable } from '@/components/employees-table';
import PageIntro from '@/components/page-intro';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { Auth, BreadcrumbItem } from '@/types';

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
    predictive_evaluation_enabled: boolean;
    account_created_at?: string | null;
    account_links: {
        password_reset: string;
        activate: string;
        deactivate: string;
    };
};

type Position = {
    id: number;
    name: string;
    linkedAccountRole?: string;
};

type Department = {
    id: number;
    name: string;
    positions: Position[];
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type Stats = {
    total: number;
    casual: number;
    permanent: number;
    job_order: number;
};

type EmployeeSortKey = 'employee_id' | 'name' | 'email' | 'position';

type DepartmentPositionRoleMap = Record<string, Record<string, string>>;

type PageProps = {
    auth: Auth;
    flash: Record<string, unknown>;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employee Directory',
        href: admin.employeeDirectory().url,
    },
];

function StatCard({
    title,
    value,
    icon: Icon,
    color,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        green: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        amber: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        blue: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20',
        primary: 'border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10',
    };
    const iconColorMap: Record<string, string> = {
        green: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
        blue: 'text-blue-600 dark:text-blue-400',
        primary: 'text-primary',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/60 p-2 dark:bg-white/10">
                    <Icon className={`size-5 ${iconColorMap[color]}`} />
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{title}</p>
                </div>
            </div>
        </div>
    );
}

export default function EmployeeDirectory({
    employees,
    search,
    sort,
    direction,
    pagination,
    stats,
    nextEmployeeId,
    nextEmployeeIdByPrefix,
    departments,
    statusFilter,
    positionFilter,
    activeDepartmentId,
    canFilterByDepartment,
    positionRoleMap,
    departmentPositionRoleMap,
    defaultEmployeeRole,
}: {
    employees: Employee[];
    search: string;
    sort: EmployeeSortKey;
    direction: 'asc' | 'desc';
    pagination: PaginationMeta;
    stats: Stats;
    nextEmployeeId: string;
    nextEmployeeIdByPrefix?: Record<string, string>;
    departments: Department[];
    statusFilter: string;
    positionFilter: string;
    activeDepartmentId?: number | null;
    canFilterByDepartment?: boolean;
    positionRoleMap?: Record<string, string>;
    departmentPositionRoleMap?: DepartmentPositionRoleMap;
    defaultEmployeeRole?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Directory" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <PageIntro
                    eyebrow={`${auth.user.role === 'hr-personnel' ? 'HR Personnel' : 'Evaluator'} · Employee Directory`}
                    title="Employee Data Management"
                    description="Manage employee records, linked accounts, departments, and role-aligned position data."
                    className="animate-slide-in-down"
                />
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Total Employees"
                        value={stats.total}
                        icon={Users}
                        color="primary"
                    />
                    <StatCard
                        title="Permanent"
                        value={stats.permanent}
                        icon={Shield}
                        color="green"
                    />
                    <StatCard
                        title="Casual"
                        value={stats.casual}
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        title="Job Order"
                        value={stats.job_order}
                        icon={Briefcase}
                        color="blue"
                    />
                </div>

                <EmployeesTable
                    employees={employees}
                    search={search}
                    sort={sort}
                    direction={direction}
                    pagination={pagination}
                    nextEmployeeId={nextEmployeeId}
                    nextEmployeeIdByPrefix={nextEmployeeIdByPrefix ?? {}}
                    departments={departments}
                    statusFilter={statusFilter}
                    positionFilter={positionFilter}
                    activeDepartmentId={activeDepartmentId ?? null}
                    canFilterByDepartment={canFilterByDepartment ?? false}
                    positionRoleMap={positionRoleMap ?? {}}
                    departmentPositionRoleMap={departmentPositionRoleMap ?? {}}
                    defaultEmployeeRole={defaultEmployeeRole ?? 'employee'}
                />
            </div>
        </AppLayout>
    );
}
