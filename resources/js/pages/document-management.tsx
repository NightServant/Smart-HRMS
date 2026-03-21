import { Head } from '@inertiajs/react';
import DocumentsTable from '@/components/documents-table';
import AppLayout from '@/layouts/app-layout';
import { documentManagement } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Employee = {
    id: number;
    name: string;
    email: string;
    role: string;
    position: string;
    employeeId: string | null;
    submissionStatus: string | null;
    submissionStage: string | null;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Document Management',
        href: documentManagement().url,
    },
];

export default function DocumentManagement({
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
            <Head title="Document Management" />
            <div className="p-4 mx-auto flex w-full flex-col gap-6 lg:items-stretch">
                <DocumentsTable employees={employees} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
