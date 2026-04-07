import { Head } from '@inertiajs/react';
import { TrainingsSeminarsTable } from '@/components/trainings-seminars-table';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Seminar = {
    id: number;
    title: string | null;
    description: string;
    target_performance_area: string;
    rating_tier: string | null;
};

type PageProps = {
    seminars: Seminar[];
    performanceAreas: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Training Suggestions',
        href: admin.trainingScheduling().url,
    },
];

export default function TrainingScheduling({
    seminars,
    performanceAreas,
}: PageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training Suggestions" />
            <div className="flex w-full flex-col gap-6 p-4 md:p-6 xl:p-8 lg:items-stretch">
                <TrainingsSeminarsTable
                    seminars={seminars}
                    performanceAreas={performanceAreas}
                />
            </div>
        </AppLayout>
    );
}
