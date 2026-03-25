import { BarChart3, CalendarRange, ChevronDown, Users, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';

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
    const [quarterData, setQuarterData] = useState<QuarterScoresData | null>(null);
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
                            'Accept': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    setQuarterData(result.data);
                } else {
                    throw new Error(result.message || 'Failed to fetch quarter scores');
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
        <div className="glass-card flex h-full w-full min-w-0 animate-fade-in-left flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-5">
            <div className="flex flex-col gap-3">
                <h1 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg lg:whitespace-nowrap">
                    <BarChart3 className="size-5 text-primary" />
                    Quarterly Performance Trends
                </h1>
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
            </div>

            <div className="mx-auto w-full max-w-full px-1 sm:max-w-none sm:px-4">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-32 w-full animate-pulse rounded bg-muted"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted-foreground">
                        Error loading quarter scores: {error}
                    </div>
                ) : (
                    <>
                        {quarterData && quarterData.aggregate && (
                            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                    <TrendingUp className={`size-5 ${
                                        quarterData.average_rating >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' :
                                        quarterData.average_rating >= 3.0 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                    }`} />
                                    <span className={`text-xl font-bold ${
                                        quarterData.average_rating >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' :
                                        quarterData.average_rating >= 3.0 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                    }`}>
                                        {quarterData.average_rating.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Avg Rating</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                    <Users className="size-5 text-primary" />
                                    <span className="text-xl font-bold">{quarterData.aggregate.total_employees}</span>
                                    <span className="text-xs text-muted-foreground">Employees</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                    <AlertTriangle className={`size-5 ${
                                        quarterData.aggregate.high_risk_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                                    }`} />
                                    <span className={`text-xl font-bold ${
                                        quarterData.aggregate.high_risk_count > 0 ? 'text-red-600 dark:text-red-400' : ''
                                    }`}>
                                        {quarterData.aggregate.high_risk_count}
                                    </span>
                                    <span className="text-xs text-muted-foreground">High Risk</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {quarterData.aggregate.satisfactory_count}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Satisfactory</span>
                                </div>
                            </div>
                        )}
                        <QuarterBarChart quarter={selectedQuarter} data={quarterData} />
                    </>
                )}
            </div>
            <Separator className="mt-2" />
            <p className="text-sm text-muted-foreground sm:ml-6">
                Performance scores for the selected quarter, showing strengths
                and areas that may need coaching.
            </p>
        </div>
    );
}
