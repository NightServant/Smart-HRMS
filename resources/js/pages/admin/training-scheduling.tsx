import { Head } from '@inertiajs/react';
import { TrainingsSeminarsTable } from '@/components/trainings-seminars-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Seminar = {
    id: number;
    description: string;
    target_performance_area: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Training Suggestions',
        href: admin.trainingScheduling().url,
    },
];

export default function TrainingScheduling({ seminars }: { seminars: Seminar[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training Suggestions" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <TrainingsSeminarsTable seminars={seminars} />
            </div>
        </AppLayout>
    );
}
