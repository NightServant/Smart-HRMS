import { useEffect, useState } from 'react';
import { DashboardChartSurface, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { AdminDashboardBarChart } from '@/components/admin-system-dashboard-charts';

type QuarterScores = {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
};

type EmployeeQuarterData = {
    employee_name: string;
    quarter_scores: QuarterScores;
};

export default function EmployeeQuarterTrends() {
    const [data, setData] = useState<EmployeeQuarterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/api/flatfat/employee-quarter-scores', {
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

                if (result.status === 'success') {
                    if (result.data) {
                        setData(result.data);
                    } else {
                        setError(result.message || 'No historical performance data available.');
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch quarter scores');
                }
            } catch (err) {
                console.error('Error fetching employee quarter scores:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <DashboardPanelCard
            title="My Quarterly Performance"
            description="Your performance scores across all quarters based on historical evaluation data."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
        >
            {isLoading ? (
                <DashboardChartSurface>
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-32 w-full animate-pulse rounded bg-muted"></div>
                    </div>
                </DashboardChartSurface>
            ) : error ? (
                <DashboardChartSurface>
                    <div className="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted-foreground">
                        {error}
                    </div>
                </DashboardChartSurface>
            ) : (
                <>
                    {data && (
                        <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <p>
                                <strong>Average Score:</strong>{' '}
                                {(
                                    (data.quarter_scores.Q1 + data.quarter_scores.Q2 + data.quarter_scores.Q3 + data.quarter_scores.Q4) / 4
                                ).toFixed(2)}{' '}
                                / 5.0
                            </p>
                        </div>
                    )}
                    <DashboardChartSurface>
                        <AdminDashboardBarChart
                            labels={['Q1', 'Q2', 'Q3', 'Q4']}
                            datasets={[{
                                label: 'Performance Score',
                                data: data
                                    ? [data.quarter_scores.Q1, data.quarter_scores.Q2, data.quarter_scores.Q3, data.quarter_scores.Q4]
                                    : [0, 0, 0, 0],
                                backgroundColor: '#4A7C3C',
                                borderColor: '#4A7C3C',
                            }]}
                            className="h-full min-h-[15rem] sm:min-h-[18rem]"
                        />
                    </DashboardChartSurface>
                </>
            )}
        </DashboardPanelCard>
    );
}
