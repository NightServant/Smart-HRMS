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
    flash: {
        employeeAccountCredentials?: {
            employeeName: string;
            employeeId: string;
            email: string;
            temporaryPassword: string;
        } | null;
    };
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
    const { auth, flash } = usePage<PageProps>().props;
    const createdAccountCredentials = flash.employeeAccountCredentials;

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

                {createdAccountCredentials && (
                    <section className="rounded-2xl border border-emerald-300/70 bg-emerald-50/90 p-5 text-emerald-950 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/25 dark:text-emerald-100">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700 dark:text-emerald-300">
                                Employee Account Ready
                            </p>
                            <h2 className="text-lg font-semibold">
                                {createdAccountCredentials.employeeName} can
                                now sign in to Smart HRMS
                            </h2>
                            <p className="text-sm text-emerald-800 dark:text-emerald-200">
                                These one-time login credentials are shown here
                                for HR because local email delivery is not
                                always visible during testing.
                            </p>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-emerald-200/80 bg-white/75 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                                    Employee ID
                                </p>
                                <p className="mt-1 font-semibold">
                                    {createdAccountCredentials.employeeId}
                                </p>
                            </div>
                            <div className="rounded-xl border border-emerald-200/80 bg-white/75 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                                    Login Email
                                </p>
                                <p className="mt-1 font-semibold break-all">
                                    {createdAccountCredentials.email}
                                </p>
                            </div>
                            <div className="rounded-xl border border-emerald-200/80 bg-white/75 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                                    Temporary Password
                                </p>
                                <p className="mt-1 font-mono font-semibold">
                                    {createdAccountCredentials.temporaryPassword}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

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
