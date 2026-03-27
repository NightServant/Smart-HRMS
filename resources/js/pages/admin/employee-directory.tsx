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

type EmployeeSortKey = "employee_id" | "name" | "email" | "position";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employee Directory',
        href: admin.employeeDirectory().url,
    },
];
export default function EmployeeDirectory({
    employees,
    search,
    sort,
    direction,
    pagination,
}: {
    employees: Employee[];
    search: string;
    sort: EmployeeSortKey;
    direction: "asc" | "desc";
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Directory" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <EmployeesTable employees={employees} search={search} sort={sort} direction={direction} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
