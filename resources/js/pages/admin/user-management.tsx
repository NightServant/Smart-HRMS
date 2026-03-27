import { Head } from '@inertiajs/react';
import { AdminUserManagementTable } from '@/components/admin-user-management-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Props = {
    users: {
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
    }[];
    roles: string[];
    filters: {
        search: string;
        role: string;
        status: string;
        twoFactor: string;
        sort: 'name' | 'email' | 'role' | 'created_at';
        direction: 'asc' | 'desc';
    };
    pagination: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: admin.userManagement().url,
    },
];

export default function UserManagement(props: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <AdminUserManagementTable {...props} />
            </div>
        </AppLayout>
    );
}
