import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardChartSurface, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { AdminDashboardDoughnutChart } from '@/components/admin-system-dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RiskData = {
    total_employees: number;
    high_risk_count: number;
    satisfactory_count: number;
    high_risk_percentage: number;
    average_rating: number;
};

type SemesterFilter = 'all' | 'S1' | 'S2';

const SEMESTER_FILTERS: { label: string; value: SemesterFilter }[] = [
    { label: 'All Time', value: 'all' },
    { label: '1st Semester', value: 'S1' },
    { label: '2nd Semester', value: 'S2' },
];

export default function RiskEmployeeAlert() {
    const [riskData, setRiskData] = useState<RiskData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('all');

    useEffect(() => {
        const fetchRiskData = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const params = new URLSearchParams();
                if (semesterFilter !== 'all') {
                    params.set('semester', semesterFilter);
                }

                const url = `/api/flatfat/evaluation-risk-summary${params.toString() ? `?${params.toString()}` : ''}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    setRiskData({
                        total_employees: result.data.total_employees || 0,
                        high_risk_count: result.data.high_risk_count || 0,
                        satisfactory_count: result.data.satisfactory_count || 0,
                        high_risk_percentage: result.data.high_risk_percentage || 0,
                        average_rating: result.data.average_rating || 0,
                    });
                } else {
                    throw new Error(result.message || 'Failed to fetch risk data');
                }
            } catch (err) {
                console.error('Error fetching risk data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setRiskData({
                    total_employees: 0,
                    high_risk_count: 0,
                    satisfactory_count: 0,
                    high_risk_percentage: 0,
                    average_rating: 0,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRiskData();

        const interval = setInterval(fetchRiskData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [semesterFilter]);

    const semesterLabel =
        semesterFilter === 'S1'
            ? 'Jan–Jun'
            : semesterFilter === 'S2'
              ? 'Jul–Dec'
              : undefined;

    return (
        <DashboardPanelCard
            title="Employee Risk Alert"
            description={error
                ? `Error loading risk data: ${error}`
                : 'Snapshot of the latest employee evaluation results and who may need follow-up coaching.'
            }
            accentClassName="right-0 top-0 size-36 rounded-full bg-chart-3/10 blur-3xl"
            headerExtras={
                <div className="flex flex-wrap items-center gap-2">
                    {!isLoading ? (
                        <>
                            <Badge
                                variant="outline"
                                className={`px-4 py-2 ${
                                    (riskData?.high_risk_count ?? 0) > 0
                                        ? 'border-primary/40 text-primary'
                                        : 'border-muted-foreground/40 text-muted-foreground'
                                }`}
                            >
                                High Risk: {riskData?.high_risk_count || 0}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-muted-foreground/40 px-4 py-2 text-muted-foreground"
                            >
                                Monitoring: {riskData?.satisfactory_count || 0}
                            </Badge>
                        </>
                    ) : undefined}
                </div>
            }
        >
            <div className="flex flex-wrap items-center gap-1.5">
                {SEMESTER_FILTERS.map((filter) => (
                    <Button
                        key={filter.value}
                        variant={semesterFilter === filter.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => setSemesterFilter(filter.value)}
                    >
                        {filter.label}
                    </Button>
                ))}
                {semesterLabel && (
                    <span className="ml-1 text-xs text-muted-foreground">
                        ({semesterLabel})
                    </span>
                )}
            </div>

            {!isLoading && riskData && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <Users className="size-5 text-primary" />
                        <span className="text-xl font-bold">{riskData.total_employees}</span>
                        <span className="text-xs text-muted-foreground">Evaluated</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <AlertTriangle className={`size-5 ${
                            riskData.high_risk_percentage > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        }`} />
                        <span className={`text-xl font-bold ${
                            riskData.high_risk_percentage > 0 ? 'text-red-600 dark:text-red-400' : ''
                        }`}>
                            {riskData.high_risk_percentage.toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground">High Risk</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <TrendingUp className={`size-5 ${
                            riskData.average_rating >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' :
                            riskData.average_rating >= 3.0 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                        }`} />
                        <span className={`text-xl font-bold ${
                            riskData.average_rating >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' :
                            riskData.average_rating >= 3.0 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                        }`}>
                            {riskData.average_rating.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">Avg Rating</span>
                    </div>
                </div>
            )}

            <DashboardChartSurface className="flex flex-1 flex-col items-center justify-center">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-32 w-32 animate-pulse rounded-full bg-muted"></div>
                    </div>
                ) : (
                    <AdminDashboardDoughnutChart
                        labels={['Low Risk', 'High Risk']}
                        data={[riskData?.satisfactory_count ?? 0, riskData?.high_risk_count ?? 0]}
                        backgroundColor={['#4A7C3C', '#EE4B2B']}
                        borderColor={['#4A7C3C', '#EE4B2B']}
                        annotationMode="percentage-only"
                        className="mx-auto h-[14rem] max-w-[15rem] sm:h-[16rem] sm:max-w-[17rem]"
                    />
                )}
            </DashboardChartSurface>
        </DashboardPanelCard>
    );
}
