import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import PredictionDisplay, {
    type PredictionResult,
} from '@/components/prediction-display';
import { Badge } from '@/components/ui/badge';

type EmployeeProfile = {
    employee_id: string;
    name: string;
    job_title: string;
    performance_rating: string | null;
    remarks: string | null;
    notification: string | null;
};

type PageProps = {
    employeeProfile?: EmployeeProfile | null;
};

export default function PredictivePerformance() {
    const { employeeProfile } = usePage<PageProps>().props;
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!employeeProfile?.name) {
            setLoading(false);
            return;
        }
        fetch(`/api/predict?employee_name=${encodeURIComponent(employeeProfile.name)}`)
            .then((r) => r.json())
            .then((data) => setPrediction(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [employeeProfile?.name]);

    return (
        <DashboardPanelCard
            title="Predictive Performance Evaluation"
            description="Review projected vs actual performance, IPCR targets, finalized evaluations, and attendance signals in one focused workspace."
            className="lg:col-span-2"
            accentClassName="right-8 bottom-0 size-40 rounded-full bg-complement-sky-300/20 blur-3xl dark:bg-complement-sky-500/10"
        >
            <div className="mb-4 grid min-w-0 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Employee ID
                    </p>
                    <p className="font-semibold text-foreground">
                        {employeeProfile?.employee_id ?? 'N/A'}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Position
                    </p>
                    <p className="font-semibold text-foreground">
                        {employeeProfile?.job_title ?? 'N/A'}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Employee Name
                    </p>
                    <p className="font-semibold text-foreground">
                        {employeeProfile?.name ?? 'N/A'}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Remarks
                    </p>
                    <p className="line-clamp-2 min-h-10 font-semibold text-foreground">
                        {employeeProfile?.remarks ?? 'No remarks yet.'}
                    </p>
                </div>
            </div>

            <PredictionDisplay prediction={prediction} loading={loading} />
            {employeeProfile?.performance_rating ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">
                        Latest rating: {employeeProfile.performance_rating}
                    </Badge>
                </div>
            ) : null}
        </DashboardPanelCard>
    );
}
