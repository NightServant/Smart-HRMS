import { Head } from '@inertiajs/react';
import { EmployeesTable }from '@/components/employees-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Employee = {
    id: number;
    name: string;
    email: string;
    role: string;
    employee_id: string;
    position: string;
    date_hired: string;
    age: string;
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employee Directory',
        href: admin.employeeDirectory().url,
    },
];
export default function EmployeeDirectory({
    employees,
    search,
    pagination,
}: {
    employees: Employee[];
    search: string;
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Directory" />
            <div className="mx-auto flex w-full flex-col gap-6 p-4 lg:items-stretch">
                <EmployeesTable employees={employees} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
