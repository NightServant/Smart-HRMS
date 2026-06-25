import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import EmployeeQuarterTrends from '@/components/employee-quarter-trends';
import PageIntro from '@/components/page-intro';
import PredictivePerformance from '@/components/predictive-performance-module';
import TrainingRecommendations, {
    type Recommendation,
} from '@/components/training-recos';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type WeakArea = {
    area: string;
    rating: number;
    severity: string;
};

type Props = {
    recommendationsEnabled?: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Personalized Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard({ recommendationsEnabled }: Props) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [riskLevel, setRiskLevel] = useState<string | undefined>(undefined);
    const [recoLoading, setRecoLoading] = useState(!!recommendationsEnabled);

    useEffect(() => {
        if (!recommendationsEnabled) return;
        fetch('/api/recommend')
            .then((r) => r.json())
            .then((data) => {
                setRecommendations(data.recommendations ?? []);
                setRiskLevel(data.risk_level ?? 'NONE');
            })
            .catch(() => {})
            .finally(() => setRecoLoading(false));
    }, [recommendationsEnabled]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalized Dashboard" />
            <div className="app-page-shell app-page-stack">
                <PageIntro
                    eyebrow="Employee Dashboard"
                    title="Personalized Performance Snapshot"
                    description="Track your trendline, review training recommendations, and monitor the predictive signals that support your next evaluation cycle."
                />
                <div className="grid items-stretch gap-6 lg:grid-cols-2">
                    <EmployeeQuarterTrends />
                    <TrainingRecommendations
                        recommendations={recommendations}
                        riskLevel={riskLevel}
                        loading={recoLoading}
                    />
                </div>
                <div>
                    <PredictivePerformance />
                </div>
            </div>
        </AppLayout>
    );
}
