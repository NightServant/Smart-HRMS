import { Head } from '@inertiajs/react';
import PredictivePerformance from '@/components/predictive-performance-module';
import QuarterPerformanceTrends from '@/components/quarter-performance-trends';
import TrainingRecommendations from '@/components/training-recos';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Recommendation = {
    seminar_id: number;
    title: string;
    description: string;
    location: string;
    time: string;
    speaker: string;
    target_performance_area: string;
    date: string;
    score: number;
    priority: 'HIGH' | 'MEDIUM';
    matched_area: string;
};

type WeakArea = {
    area: string;
    rating: number;
    severity: string;
};

type Props = {
    recommendations?: Recommendation[];
    riskLevel?: string;
    weakAreas?: WeakArea[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Personalized Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard({ recommendations = [], riskLevel, weakAreas = [] }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalized Dashboard" />
            <div className="p-4 mx-auto flex w-full flex-col gap-6 xl:grid xl:grid-cols-2 xl:items-stretch">
                <QuarterPerformanceTrends />
                <TrainingRecommendations recommendations={recommendations} riskLevel={riskLevel} />
                <PredictivePerformance />
            </div>
        </AppLayout>
    );
}
