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
} from '@/components/ui/quarter-bar-chart';

type SemesterPeriod = 'S1' | 'S2';

type SemesterScoresData = {
    year: number | null;
    period: SemesterPeriod;
    available_years: number[];
    average_rating: number;
    employee_scores?: {
        employee_name: string;
        final_rating: number;
    }[];
    aggregate?: {
        total_employees: number;
        year_total_employees?: number;
        high_risk_count: number;
        satisfactory_count: number;
    };
};

export default function QuarterPerformanceTrends() {
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<SemesterPeriod>('S2');
    const [semesterData, setSemesterData] = useState<SemesterScoresData | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedPeriodLabel = useMemo((): string => {
        const labels: Record<SemesterPeriod, string> = {
            S1: '1st Semester (Jan - June)',
            S2: '2nd Semester (July - December)',
        };

        return labels[selectedPeriod];
    }, [selectedPeriod]);

    useEffect(() => {
        const fetchSemesterScores = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);
                const params = new URLSearchParams();
                if (selectedYear) {
                    params.set('year', selectedYear);
                }
                params.set('period', selectedPeriod);

                const response = await fetch(
                    `/api/flatfat/semester-scores?${params.toString()}`,
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
                    setSemesterData(result.data);
                    if (result.data.year !== null && String(result.data.year) !== selectedYear) {
                        setSelectedYear(String(result.data.year));
                    }
                    if (result.data.period !== selectedPeriod) {
                        setSelectedPeriod(result.data.period);
                    }
                } else {
                    throw new Error(
                        result.message || 'Failed to fetch semester scores',
                    );
                }
            } catch (err) {
                console.error('Error fetching semester scores:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setSemesterData(null);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchSemesterScores();
    }, [selectedYear, selectedPeriod]);

    return (
        <DashboardPanelCard
            title="Semestral Performance"
            description="Evaluation scores for the selected semester, showing who is performing well and who may need coaching."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
            className="gap-4"
            contentClassName="gap-3"
            headerExtras={
                <div className="flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center">
                    <label className="flex items-center gap-1 text-sm text-muted-foreground sm:whitespace-nowrap">
                        <CalendarRange className="size-4 text-primary" />
                        Select Semester:
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between sm:w-32"
                                >
                                    {selectedYear || 'Year'}
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="max-h-56 overflow-y-auto"
                            >
                                {(semesterData?.available_years ?? []).length > 0 ? (
                                    semesterData?.available_years.map((year) => (
                                        <DropdownMenuItem
                                            key={year}
                                            onClick={() => setSelectedYear(String(year))}
                                        >
                                            {year}
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        No semestral data
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between sm:min-w-[16rem]"
                                >
                                    {selectedPeriodLabel}
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="max-h-56 overflow-y-auto"
                            >
                                <DropdownMenuItem
                                    onClick={() => setSelectedPeriod('S1')}
                                >
                                    1st Semester (Jan - June)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setSelectedPeriod('S2')}
                                >
                                    2nd Semester (July - December)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
                        Error loading semester scores: {error}
                    </div>
                </DashboardChartSurface>
            ) : (
                <>
                    {semesterData && semesterData.aggregate && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <TrendingUp
                                    className={`size-4 sm:size-5 ${
                                        semesterData.average_rating >= 4.0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : semesterData.average_rating >= 3.0
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-red-600 dark:text-red-400'
                                    }`}
                                />
                                <span
                                    className={`text-lg font-bold sm:text-xl ${
                                        semesterData.average_rating >= 4.0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : semesterData.average_rating >= 3.0
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    {semesterData.average_rating.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Avg Score
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <Users className="size-4 text-primary sm:size-5" />
                                <span className="text-lg font-bold sm:text-xl">
                                    {semesterData.aggregate.year_total_employees ??
                                        semesterData.aggregate.total_employees}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Employees
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <AlertTriangle
                                    className={`size-4 sm:size-5 ${
                                        semesterData.aggregate.high_risk_count >
                                        0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-muted-foreground'
                                    }`}
                                />
                                <span
                                    className={`text-lg font-bold sm:text-xl ${
                                        semesterData.aggregate.high_risk_count >
                                        0
                                            ? 'text-red-600 dark:text-red-400'
                                            : ''
                                    }`}
                                >
                                    {semesterData.aggregate.high_risk_count}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    High Risk
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                                <CheckCircle2 className="size-4 text-emerald-600 sm:size-5 dark:text-emerald-400" />
                                <span className="text-lg font-bold text-emerald-600 sm:text-xl dark:text-emerald-400">
                                    {semesterData.aggregate.satisfactory_count}
                                </span>
                                <span className="text-[11px] text-muted-foreground sm:text-xs">
                                    Satisfactory
                                </span>
                            </div>
                        </div>
                    )}
                    <DashboardChartSurface className="sm:hidden">
                        <div className="flex min-h-[7rem] items-center justify-center rounded-2xl bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                            Detailed semestral chart is available on larger
                            screens.
                        </div>
                    </DashboardChartSurface>
                    <DashboardChartSurface className="hidden sm:block">
                        {(semesterData?.employee_scores?.length ?? 0) === 0 && (
                            <div className="flex min-h-[12rem] items-center justify-center rounded-2xl bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                                No semestral evaluation data available for the selected filters.
                            </div>
                        )}
                        <QuarterBarChart
                            data={semesterData}
                            className="h-48 sm:h-72"
                        />
                    </DashboardChartSurface>
                </>
            )}
        </DashboardPanelCard>
    );
}
