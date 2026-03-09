import { Head } from '@inertiajs/react';
import { HistoricalDataTable } from '@/components/historical-data-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type HistoricalDataRecord = {
    id: number;
    employeeName: string;
    departmentName: string;
    year: number;
    quarter: string;
    attendancePunctualityRate: string;
    absenteeismDays: number;
    tardinessIncidents: number;
    trainingCompletionStatus: number;
    evaluatedPerformanceScore: number;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Historical Data Management',
        href: admin.historicalData().url,
    },
];

export default function HistoricalData({
    historicalData,
    search,
    pagination,
}: {
    historicalData: HistoricalDataRecord[];
    search: string;
    pagination: PaginationMeta;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historical Data" />
            <div className="mx-auto my-auto flex w-full flex-col gap-6 p-4 lg:items-stretch">
                <HistoricalDataTable historicalData={historicalData} search={search} pagination={pagination} />
            </div>
        </AppLayout>
    );
}
