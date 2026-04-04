import { usePage } from '@inertiajs/react';
import { Briefcase, MessageSquare, UserRound } from 'lucide-react';
import { DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import PredictionDisplay, {
    type PredictionResult,
} from '@/components/prediction-display';

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
    prediction?: PredictionResult | null;
};

export default function PredictivePerformance() {
    const { employeeProfile, prediction } = usePage<PageProps>().props;

    return (
        <DashboardPanelCard
            title="Predictive Performance Analysis"
            description="AI-powered analysis based on historical evaluation data."
            className="lg:col-span-2"
            accentClassName="right-8 bottom-0 size-40 rounded-full bg-complement-sky-300/20 blur-3xl dark:bg-complement-sky-500/10"
        >
            <PredictionDisplay
                prediction={prediction ?? null}
                loading={false}
            />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1 rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                        <UserRound className="size-4 text-primary" />
                        Employee ID: {employeeProfile?.employee_id ?? 'N/A'}
                    </p>
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                        <UserRound className="size-4 text-primary" />
                        Name: {employeeProfile?.name ?? 'N/A'}
                    </p>
                </div>
                <div className="space-y-1 rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-md sm:text-right dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                    <p className="flex items-center justify-start gap-2 font-semibold text-foreground lg:justify-end">
                        <Briefcase className="size-4 text-primary" />
                        Position: {employeeProfile?.job_title ?? 'N/A'}
                    </p>
                    <p className="flex items-start justify-start gap-2 break-words lg:justify-end">
                        <MessageSquare className="size-4 text-primary" />
                        Remarks: {employeeProfile?.remarks ?? 'No remarks yet.'}
                    </p>
                </div>
            </div>
        </DashboardPanelCard>
    );
}
