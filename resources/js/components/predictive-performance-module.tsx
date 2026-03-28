import { usePage } from '@inertiajs/react';
import { Briefcase, ChartLine, MessageSquare, UserRound } from 'lucide-react';
import { dashboardGlassCardClassName } from '@/components/admin-system-dashboard-cards';
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
        <div className={`${dashboardGlassCardClassName} col-span-2 flex w-full min-w-0 animate-fade-in flex-col gap-4 rounded-xl p-4 transition-shadow hover:shadow-md sm:gap-5`}>
            <h1 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg">
                <ChartLine className="size-5 text-primary" />
                Predictive Performance Analysis
            </h1>
            <PredictionDisplay
                prediction={prediction ?? null}
                loading={false}
            />
            <div className="grid grid-cols-1 gap-3 rounded-lg md:grid-cols-2">
                <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                        <UserRound className="size-4 text-primary" />
                        Employee ID: {employeeProfile?.employee_id ?? 'N/A'}
                    </p>
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                        <UserRound className="size-4 text-primary" />
                        Name: {employeeProfile?.name ?? 'N/A'}
                    </p>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
                    <p className="flex items-center justify-start gap-2 font-semibold text-foreground sm:justify-end">
                        <Briefcase className="size-4 text-primary" />
                        Position: {employeeProfile?.job_title ?? 'N/A'}
                    </p>
                    <p className="flex items-center justify-start gap-2 sm:justify-end">
                        <MessageSquare className="size-4 text-primary" />
                        Remarks: {employeeProfile?.remarks ?? 'No remarks yet.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
