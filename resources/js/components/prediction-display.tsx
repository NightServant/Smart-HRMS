import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ChartLine,
    Info,
    Loader2,
    TrendingUp,
} from 'lucide-react';
import { DashboardChartSurface } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { MultiLineChart } from '@/components/ui/line-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ComparisonRow = {
    year: number;
    period: string;
    evaluation_score: number;
    target_score?: number | null;
    achievement_status: string;
    achievement_label: string;
    target_items: string[];
    target_summary?: string | null;
    actual_items: string[];
    actual_summary?: string | null;
    attendance_punctuality_rate: number;
    tardiness_incidents: number;
    on_time_days: number;
    late_days: number;
    incomplete_days: number;
    complete_days: number;
    recorded_days: number;
    source: string;
};

export type PredictionResult = {
    status: string;
    employee_name: string;
    notification?: string;
    historical?: {
        labels: string[];
        scores: number[];
        yearly_labels: string[];
        yearly_scores: number[];
        records?: Array<{
            year: number;
            period: string;
            attendance_punctuality_rate: number;
            absenteeism_days: number;
            tardiness_incidents: number;
            training_completion_status: number;
            evaluated_performance_score: number;
            source: string;
        }>;
        semester_labels?: string[];
        available_years?: number[];
        by_year?: Record<string, [number | null, number | null]>;
        all_year_scores?: [number | null, number | null];
    };
    forecast?: {
        labels: string[];
        scores: number[];
        semester_labels?: string[];
    };
    comparison?: {
        rows: ComparisonRow[];
    };
    trend?: string;
    recent_avg?: number;
    forecast_avg?: number;
    coefficients?: Record<string, number>;
    error_metrics?: {
        mse: number | null;
        rmse: number | null;
        mae: number | null;
        r2: number | null;
        threshold: number | null;
        split_fallback: boolean;
    };
};

type Props = {
    prediction: PredictionResult | null;
    loading: boolean;
};

type TrendKey = 'IMPROVING' | 'STABLE' | 'DECLINING';

type TrendConfig = {
    icon: typeof ArrowRight;
    color: string;
    bg: string;
    label: string;
    description: string;
};

const TREND_CONFIGS: Record<TrendKey, TrendConfig> = {
    IMPROVING: {
        icon: ArrowUp,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'border-emerald-300/60 bg-emerald-100/70 dark:border-emerald-700/60 dark:bg-emerald-900/30',
        label: 'Improving',
        description: 'Forecast > recent average by more than 0.10',
    },
    STABLE: {
        icon: ArrowRight,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'border-amber-300/60 bg-amber-100/70 dark:border-amber-700/60 dark:bg-amber-900/30',
        label: 'Stabilizing',
        description: 'Forecast within ±0.10 of the recent average',
    },
    DECLINING: {
        icon: ArrowDown,
        color: 'text-red-600 dark:text-red-400',
        bg: 'border-red-300/60 bg-red-100/70 dark:border-red-700/60 dark:bg-red-900/30',
        label: 'Declining',
        description: 'Forecast < recent average by more than 0.10',
    },
};

function resolveTrendConfig(trend: string): TrendConfig {
    const normalized = trend.toUpperCase() as TrendKey;

    return TREND_CONFIGS[normalized] ?? TREND_CONFIGS.STABLE;
}

function PredictionGuide({ activeTrend }: { activeTrend: TrendKey }) {
    const order: TrendKey[] = ['DECLINING', 'STABLE', 'IMPROVING'];

    return (
        <div className="rounded-2xl border border-border/70 bg-background/60 p-3 mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                <Info className="size-3.5" />
                Prediction Guide
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
                {order.map((key) => {
                    const config = TREND_CONFIGS[key];
                    const Icon = config.icon;
                    const isActive = activeTrend === key;

                    return (
                        <div
                            key={key}
                            className={`flex items-start gap-2 rounded-xl border px-3 py-2 transition-colors ${
                                isActive
                                    ? `${config.bg} ${config.color}`
                                    : 'border-border/60 bg-background/40 text-muted-foreground'
                            }`}
                        >
                            <Icon className="mt-0.5 size-4 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold">
                                    {config.label}
                                    {isActive ? (
                                        <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                                            Active
                                        </span>
                                    ) : null}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug opacity-80">
                                    {config.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function buildForecastYearAverages(
    labels: string[],
    scores: number[],
): Record<string, number> {
    const grouped = new Map<string, number[]>();

    labels.forEach((label, index) => {
        const score = scores[index];

        if (score == null) {
            return;
        }

        const year = label.split('-S')[0] ?? label;
        const existing = grouped.get(year) ?? [];
        existing.push(score);
        grouped.set(year, existing);
    });

    return Object.fromEntries(
        Array.from(grouped.entries()).map(([year, values]) => [
            year,
            Number(
                (
                    values.reduce((sum, value) => sum + value, 0) /
                    values.length
                ).toFixed(2),
            ),
        ]),
    );
}

function ChartLegendItem({
    label,
    tone,
    dashed = false,
}: {
    label: string;
    tone: 'green' | 'blue';
    dashed?: boolean;
}) {
    const lineColor = tone === 'green' ? '#4A7C3C' : '#2A5A8C';

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground">
            <span className="relative block h-0 w-8 shrink-0">
                <span
                    className="absolute inset-x-0 top-1/2 block h-0.5 -translate-y-1/2"
                    style={{
                        backgroundColor: dashed ? 'transparent' : lineColor,
                        backgroundImage: dashed
                            ? `repeating-linear-gradient(to right, ${lineColor} 0 6px, transparent 6px 10px)`
                            : 'none',
                    }}
                />
            </span>
            <span>{label}</span>
        </div>
    );
}

export default function PredictionDisplay({ prediction, loading }: Props) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">Generating predictions...</p>
            </div>
        );
    }

    const hasPrediction = prediction !== null;
    const historicalLabels = prediction?.historical?.labels ?? [];
    const comparisonRows = prediction?.comparison?.rows ?? [];
    const hasHistorical = historicalLabels.length > 0;
    const hasForecast =
        prediction?.status === 'ok' &&
        (prediction.forecast?.labels?.length ?? 0) > 0;

    if (!hasPrediction) {
        return (
            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/70 bg-muted/10 py-12 text-muted-foreground">
                <ChartLine className="size-8 opacity-40" />
                <p className="text-sm">
                    Insufficient historical data for prediction.
                </p>
            </div>
        );
    }

    if (!hasHistorical && comparisonRows.length === 0) {
        return (
            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/70 bg-muted/10 py-12 text-muted-foreground">
                <ChartLine className="size-8 opacity-40" />
                <p className="text-sm">
                    {prediction.notification ??
                        'Insufficient historical data for prediction.'}
                </p>
            </div>
        );
    }

    const trendKey = (
        prediction.trend ?? 'STABLE'
    ).toUpperCase() as TrendKey;
    const trendConfig = resolveTrendConfig(trendKey);
    const TrendIcon = trendConfig.icon;
    const historicalYearLabels = prediction.historical?.yearly_labels ?? [];
    const historicalYearScores = prediction.historical?.yearly_scores ?? [];
    const forecastYearAverages = buildForecastYearAverages(
        prediction.forecast?.labels ?? [],
        prediction.forecast?.scores ?? [],
    );
    const yearLabels = Array.from(
        new Set([...historicalYearLabels, ...Object.keys(forecastYearAverages)]),
    ).sort((left, right) => Number(left) - Number(right));
    const historicalYearData = yearLabels.map((year) => {
        const index = historicalYearLabels.indexOf(year);

        return index >= 0 ? historicalYearScores[index] ?? null : null;
    });
    const forecastYearData = yearLabels.map(
        (year) => forecastYearAverages[year] ?? null,
    );
    const lastHistoricalYear = historicalYearLabels.at(-1);
    const lastHistoricalScore = historicalYearScores.at(-1) ?? null;

    if (lastHistoricalYear && lastHistoricalScore !== null) {
        const lastHistoricalIndex = yearLabels.indexOf(lastHistoricalYear);

        if (
            lastHistoricalIndex >= 0 &&
            forecastYearData[lastHistoricalIndex] === null
        ) {
            forecastYearData[lastHistoricalIndex] = lastHistoricalScore;
        }
    }
    const achievedCount = comparisonRows.filter(
        (row) => row.achievement_status === 'strongly_achieved',
    ).length;
    const onTrackCount = comparisonRows.filter(
        (row) => row.achievement_status === 'on_track',
    ).length;
    const needsImprovementCount = comparisonRows.filter(
        (row) => row.achievement_status === 'needs_improvement',
    ).length;

    const ipcrComparisonRows = comparisonRows
        .filter(
            (row) =>
                typeof row.target_score === 'number' &&
                row.target_score !== null,
        )
        .slice()
        .sort((left, right) => {
            if (left.year !== right.year) {
                return left.year - right.year;
            }

            const leftPeriod = left.period === 'S2' ? 2 : 1;
            const rightPeriod = right.period === 'S2' ? 2 : 1;

            return leftPeriod - rightPeriod;
        });
    const ipcrLabels = ipcrComparisonRows.map(
        (row) =>
            `${row.year} ${row.period === 'S2' ? '2nd Sem' : '1st Sem'}`,
    );
    const ipcrTargetData = ipcrComparisonRows.map(
        (row) => row.target_score ?? null,
    );
    const ipcrActualData = ipcrComparisonRows.map(
        (row) => row.evaluation_score ?? null,
    );
    const hasIpcrComparison = ipcrComparisonRows.length > 0;

    return (
        <div className="space-y-4">
            {prediction.notification ? (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-100/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100">
                    {prediction.notification}
                </div>
            ) : null}

            <Tabs defaultValue="trends" className="w-full">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="trends">
                        Yearly Performance Trends
                    </TabsTrigger>
                    <TabsTrigger value="ipcr">
                        IPCR Targets vs Actual Evaluation Results
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="trends" className="mt-4 space-y-4">
            {hasHistorical ? (
                <DashboardChartSurface className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold">
                                <TrendingUp className="size-4 text-primary" />
                                Yearly Performance Trends: Projected vs Actual
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Actual semestral evaluation history is paired
                                with attendance-backed context. Forecast output
                                appears when enough reliable records exist.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ChartLegendItem
                                label="Actual Performance"
                                tone="green"
                            />
                            {hasForecast ? (
                                <ChartLegendItem
                                    label="Projected Performance"
                                    tone="blue"
                                    dashed
                                />
                            ) : null}
                            <Badge variant="outline">
                                {hasForecast ? 'Forecast Ready' : 'Historical Only'}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={`${trendConfig.bg} ${trendConfig.color}`}
                            >
                                <TrendIcon className="size-4" />
                                {trendConfig.label}
                            </Badge>
                        </div>
                    </div>

                    <MultiLineChart
                        labels={yearLabels}
                        datasets={[
                            {
                                label: 'Actual Performance',
                                data: historicalYearData,
                                borderColor: '#4A7C3C',
                                backgroundColor: '#91C383',
                                borderWidth: 3,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                            },
                            ...(hasForecast
                                ? [
                                      {
                                          label: 'Projected Performance',
                                          data: forecastYearData,
                                          borderColor: '#3B82F6',
                                          backgroundColor: '#60A5FA',
                                          borderDash: [8, 6],
                                          borderWidth: 3,
                                          pointRadius: 5,
                                          pointHoverRadius: 7,
                                          spanGaps: true,
                                      },
                                  ]
                                : []),
                        ]}
                    />

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm my-4">
                        <span className="text-muted-foreground">
                            Historical avg:{' '}
                            <span className="font-semibold text-foreground">
                                {prediction.recent_avg?.toFixed(2) ?? '—'}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            Forecast avg:{' '}
                            <span className="font-semibold text-foreground">
                                {prediction.forecast_avg?.toFixed(2) ?? '—'}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            Periods analyzed:{' '}
                            <span className="font-semibold text-foreground">
                                {historicalLabels.length}
                            </span>
                        </span>
                        {prediction.error_metrics ? (
                            <>
                                <span className="text-muted-foreground">
                                    RMSE:{' '}
                                    <span className="font-semibold text-foreground">
                                        {prediction.error_metrics.rmse?.toFixed(
                                            3,
                                        ) ?? '—'}
                                    </span>
                                </span>
                                <span className="text-muted-foreground">
                                    MAE:{' '}
                                    <span className="font-semibold text-foreground">
                                        {prediction.error_metrics.mae?.toFixed(
                                            3,
                                        ) ?? '—'}
                                    </span>
                                </span>
                                <span className="text-muted-foreground">
                                    R²:{' '}
                                    <span className="font-semibold text-foreground">
                                        {prediction.error_metrics.r2?.toFixed(
                                            3,
                                        ) ?? '—'}
                                    </span>
                                </span>
                            </>
                        ) : null}
                    </div>

                    <PredictionGuide activeTrend={trendKey} />
                </DashboardChartSurface>
            ) : null}
                </TabsContent>

                <TabsContent value="ipcr" className="mt-4 space-y-4">
                    <DashboardChartSurface className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="flex items-center gap-2 text-sm font-semibold">
                                    <TrendingUp className="size-4 text-primary" />
                                    IPCR Targets vs Actual Evaluation Results
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Comparison between IPCR Targets and Actual
                                    Evaluation Results per finalized semester.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ChartLegendItem
                                    label="IPCR Targets"
                                    tone="blue"
                                    dashed
                                />
                                <ChartLegendItem
                                    label="Actual Results"
                                    tone="green"
                                />
                            </div>
                        </div>

                        {hasIpcrComparison ? (
                            <MultiLineChart
                                labels={ipcrLabels}
                                datasets={[
                                    {
                                        label: 'IPCR Targets',
                                        data: ipcrTargetData,
                                        borderColor: '#3B82F6',
                                        backgroundColor: '#60A5FA',
                                        borderDash: [8, 6],
                                        borderWidth: 3,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    },
                                    {
                                        label: 'Actual Results',
                                        data: ipcrActualData,
                                        borderColor: '#4A7C3C',
                                        backgroundColor: '#91C383',
                                        borderWidth: 3,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    },
                                ]}
                            />
                        ) : (
                            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/70 bg-muted/10 py-12 text-muted-foreground">
                                <ChartLine className="size-8 opacity-40" />
                                <p className="text-sm">
                                    No finalized IPCR target-versus-actual
                                    records are available yet.
                                </p>
                            </div>
                        )}
                    </DashboardChartSurface>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-300">
                                Strongly Achieved
                            </p>
                            <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                                {achievedCount}
                            </p>
                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                Periods where the actual result met or exceeded the target.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <p className="text-xs font-semibold tracking-[0.18em] text-blue-700 uppercase dark:text-blue-300">
                                On Track
                            </p>
                            <p className="mt-2 text-2xl font-bold text-blue-800 dark:text-blue-200">
                                {onTrackCount}
                            </p>
                            <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80">
                                Periods within close range of the planned target.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase dark:text-amber-300">
                                Needs Improvement
                            </p>
                            <p className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-200">
                                {needsImprovementCount}
                            </p>
                            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                                Periods where the actual result fell short of the target.
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
