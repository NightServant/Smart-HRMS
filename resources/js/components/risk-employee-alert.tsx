import { ShieldAlert, TriangleAlert, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardChartSurface, dashboardGlassCardClassName } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { DoughnutChart } from '@/components/ui/doughnut-chart';
import { Separator } from '@/components/ui/separator';

type RiskData = {
    total_employees: number;
    high_risk_count: number;
    satisfactory_count: number;
    high_risk_percentage: number;
    average_rating: number;
};

export default function RiskEmployeeAlert() {
    const [riskData, setRiskData] = useState<RiskData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRiskData = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/api/flatfat/organization-aggregate', {
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
                // Use default values on error
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

        // Refresh every 5 minutes
        const interval = setInterval(fetchRiskData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`${dashboardGlassCardClassName} flex h-full w-full min-w-0 flex-1 animate-fade-in-right flex-col gap-4 rounded-xl p-4 transition-shadow hover:shadow-md sm:gap-5`}>
            <div className="flex flex-col gap-3">
                <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg lg:whitespace-nowrap">
                    <ShieldAlert className="size-5 text-primary" />
                    Employee Risk Alert
                </h1>
                {isLoading ? (
                    <div className="flex gap-2">
                        <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
                        <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
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
                    </div>
                )}
            </div>

            {!isLoading && riskData && (
                <div className="grid grid-cols-3 gap-3 px-1 sm:px-4">
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
                        <Users className="size-5 text-primary" />
                        <span className="text-xl font-bold">{riskData.total_employees}</span>
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
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
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
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

            <div className="mx-auto w-full max-w-full px-1 sm:max-w-none sm:px-4">
                <DashboardChartSurface>
                    {isLoading ? (
                        <div className="flex h-40 items-center justify-center">
                            <div className="h-32 w-32 animate-pulse rounded-full bg-muted"></div>
                        </div>
                    ) : (
                        <DoughnutChart data={{
                            lowRisk: riskData?.satisfactory_count ?? 0,
                            highRisk: riskData?.high_risk_count ?? 0,
                        }} />
                    )}
                </DashboardChartSurface>
            </div>
            <Separator className="mt-2" />
            <div className="flex items-start gap-2 text-sm text-muted-foreground sm:ml-6 sm:text-left">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error ? (
                    <span>Error loading risk data: {error}</span>
                ) : (
                    <span>
                        Snapshot of employees based on recent performance patterns (Last updated: {new Date().toLocaleTimeString()}).
                    </span>
                )}
            </div>
        </div>
    );
}
