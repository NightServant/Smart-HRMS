import { usePage } from '@inertiajs/react';
import { Briefcase, ChartLine, MessageSquare, TrendingUp, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/ui/line-chart';

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

    return (
        <div className="animate-fade-in col-span-2 flex w-full flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 shadow-xl transition-shadow duration-300 hover:shadow-2xl sm:gap-5">
            <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                <ChartLine className="size-5 text-primary" />
                Predictive Performance Analysis
            </h1>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Card className="h-full w-full min-w-0 bg-card transition-shadow duration-300 hover:shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-primary" />
                            Historical Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0 pt-0">
                        <div className="mx-auto w-full min-w-0">
                            <LineChart />
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-full w-full min-w-0 bg-card transition-shadow duration-300 hover:shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <ChartLine className="size-4 text-primary" />
                            Projected Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0 pt-0">
                        <div className="mx-auto w-full min-w-0">
                            <LineChart />
                        </div>
                    </CardContent>
                </Card>
            </div>
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
