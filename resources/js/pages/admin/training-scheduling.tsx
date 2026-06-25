import { Head } from '@inertiajs/react';
import PageIntro from '@/components/page-intro';
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
            <div className="app-page-shell app-page-stack">
                <PageIntro
                    eyebrow="HR Personnel · Training"
                    title="Training Suggestions"
                    description="Automated training recommendations based on employee competency gaps."
                />
                <TrainingsSeminarsTable
                    seminars={seminars}
                    performanceAreas={performanceAreas}
                />
            </div>
        </AppLayout>
    );
}
