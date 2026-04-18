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
    period?: string | null;
    quarter?: string | null;
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

type HistoricalSortKey =
    | "employee_name"
    | "department_name"
    | "year"
    | "period"
    | "quarter"
    | "attendance_punctuality_rate"
    | "absenteeism_days"
    | "tardiness_incidents"
    | "training_completion_status"
    | "evaluated_performance_score";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Historical Data Management',
        href: admin.historicalData().url,
    },
];

export default function HistoricalData({
    historicalData,
    search,
    sort,
    direction,
    pagination,
    year,
}: {
    historicalData: HistoricalDataRecord[];
    search: string;
    sort: HistoricalSortKey;
    direction: "asc" | "desc";
    pagination: PaginationMeta;
    year: number | null;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historical Data" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <HistoricalDataTable historicalData={historicalData} search={search} sort={sort} direction={direction} pagination={pagination} year={year} />
            </div>
        </AppLayout>
    );
}
