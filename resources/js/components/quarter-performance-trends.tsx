import {
    AlertTriangle,
    CalendarRange,
    CheckCircle2,
    ChevronDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    DashboardChartSurface,
    DashboardPanelCard,
} from '@/components/admin-system-dashboard-cards';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    QuarterBarChart,
    type Quarter,
} from '@/components/ui/quarter-bar-chart';

type QuarterScoresData = {
    quarter: string;
    average_rating: number;
    aggregate?: {
        total_employees: number;
        high_risk_count: number;
        satisfactory_count: number;
    };
};

export default function QuarterPerformanceTrends() {
    const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
    const [quarterData, setQuarterData] = useState<QuarterScoresData | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedQuarterLabel = useMemo((): string => {
        const labels: Record<Quarter, string> = {
            Q1: '1st Quarter',
            Q2: '2nd Quarter',
            Q3: '3rd Quarter',
            Q4: '4th Quarter',
        };

        return labels[selectedQuarter];
    }, [selectedQuarter]);

    useEffect(() => {
        const fetchQuarterScores = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(
                    `/api/flatfat/quarter-scores?quarter=${selectedQuarter}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    setQuarterData(result.data);
                } else {
                    throw new Error(
                        result.message || 'Failed to fetch quarter scores',
                    );
                }
            } catch (err) {
                console.error('Error fetching quarter scores:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setQuarterData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuarterScores();
    }, [selectedQuarter]);

    return (
        <DashboardPanelCard
            title="Quarterly Performance Trends"
            description="Performance scores for the selected quarter, showing strengths and areas that may need coaching."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
            className="gap-4"
            contentClassName="gap-3"
            headerExtras={
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center">
                    <label className="flex items-center gap-1 text-sm text-muted-foreground sm:whitespace-nowrap">
                        <CalendarRange className="size-4 text-primary" />
                        Select Quarter:
                    </label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between sm:w-40 sm:min-w-[10rem]"
                            >
                                {selectedQuarterLabel}
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="max-h-56 overflow-y-auto"
                        >
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q1')}
                            >
                                1st Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q2')}
                            >
                                2nd Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q3')}
                            >
                                3rd Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q4')}
                            >
                                4th Quarter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            }
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
                        Error loading quarter scores: {error}
                    </div>
                </DashboardChartSurface>
            ) : (
                <>
                    {quarterData && quarterData.aggregate && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <TrendingUp
                                    className={`size-4 sm:size-5 ${
                                        quarterData.average_rating >= 4.0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : quarterData.average_rating >= 3.0
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-red-600 dark:text-red-400'
                                    }`}
                                />
                                <span
                                    className={`text-lg font-bold sm:text-xl ${
                                        quarterData.average_rating >= 4.0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : quarterData.average_rating >= 3.0
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    {quarterData.average_rating.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Avg Rating
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <Users className="size-4 text-primary sm:size-5" />
                                <span className="text-lg font-bold sm:text-xl">
                                    {quarterData.aggregate.total_employees}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Employees
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <AlertTriangle
                                    className={`size-4 sm:size-5 ${
                                        quarterData.aggregate.high_risk_count >
                                        0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-muted-foreground'
                                    }`}
                                />
                                <span
                                    className={`text-lg font-bold sm:text-xl ${
                                        quarterData.aggregate.high_risk_count >
                                        0
                                            ? 'text-red-600 dark:text-red-400'
                                            : ''
                                    }`}
                                >
                                    {quarterData.aggregate.high_risk_count}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    High Risk
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <CheckCircle2 className="size-4 text-emerald-600 sm:size-5 dark:text-emerald-400" />
                                <span className="text-lg font-bold text-emerald-600 sm:text-xl dark:text-emerald-400">
                                    {quarterData.aggregate.satisfactory_count}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Satisfactory
                                </span>
                            </div>
                        </div>
                    )}
                    <DashboardChartSurface className="sm:hidden">
                        <div className="flex min-h-[7rem] items-center justify-center rounded-2xl bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                            Detailed quarter chart is available on larger
                            screens.
                        </div>
                    </DashboardChartSurface>
                    <DashboardChartSurface className="hidden sm:block">
                        <QuarterBarChart
                            quarter={selectedQuarter}
                            data={quarterData}
                            className="h-48 sm:h-72"
                        />
                    </DashboardChartSurface>
                </>
            )}
        </DashboardPanelCard>
    );
}
