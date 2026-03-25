import { Head } from '@inertiajs/react';
import EmployeeQuarterTrends from '@/components/employee-quarter-trends';
import PredictivePerformance from '@/components/predictive-performance-module';
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

export default function Dashboard({ recommendations = [], riskLevel }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalized Dashboard" />
            <div className="w-full p-6">
                <div className="grid items-stretch gap-6 xl:grid-cols-2">
                    <EmployeeQuarterTrends />
                    <TrainingRecommendations
                        recommendations={recommendations}
                        riskLevel={riskLevel}
                    />
                </div>
                <div className="mt-6">
                    <PredictivePerformance />
                </div>
            </div>
        </AppLayout>
    );
}
