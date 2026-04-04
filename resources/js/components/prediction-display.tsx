import { ArrowDown, ArrowRight, ArrowUp, ChartLine, Loader2, TrendingUp } from 'lucide-react';
import { DashboardChartSurface } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { MultiLineChart } from '@/components/ui/line-chart';

export type PredictionResult = {
    status: string;
    employee_name: string;
    notification?: string;
    historical: {
        labels: string[];
        scores: number[];
        yearly_labels: string[];
        yearly_scores: number[];
        semester_labels?: string[];
        available_years?: number[];
        by_year?: Record<string, [number | null, number | null]>;
        all_year_scores?: [number | null, number | null];
    };
    forecast: {
        labels: string[];
        scores: number[];
        semester_labels?: string[];
    };
    trend: string;
    recent_avg: number;
    forecast_avg: number;
    coefficients: Record<string, number>;
};

type Props = {
    prediction: PredictionResult | null;
    loading: boolean;
};

function buildForecastYearAverages(labels: string[], scores: number[]): Record<string, number> {
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
            Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
        ]),
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

    if (!prediction || prediction.status !== 'ok') {
        return (
            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/70 bg-muted/10 py-12 text-muted-foreground">
                <ChartLine className="size-8 opacity-40" />
                <p className="text-sm">
                    {prediction?.notification ?? 'Insufficient historical data for prediction.'}
                </p>
            </div>
        );
    }

    const trendConfig = {
        IMPROVING: { icon: ArrowUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'border-emerald-300/60 bg-emerald-100/70 dark:border-emerald-700/60 dark:bg-emerald-900/30', label: 'Improving' },
        DECLINING: { icon: ArrowDown, color: 'text-red-600 dark:text-red-400', bg: 'border-red-300/60 bg-red-100/70 dark:border-red-700/60 dark:bg-red-900/30', label: 'Declining' },
        STABLE: { icon: ArrowRight, color: 'text-amber-600 dark:text-amber-400', bg: 'border-amber-300/60 bg-amber-100/70 dark:border-amber-700/60 dark:bg-amber-900/30', label: 'Stable' },
    }[prediction.trend] ?? { icon: ArrowRight, color: 'text-muted-foreground', bg: 'border-border/70 bg-muted/10', label: prediction.trend };

    const TrendIcon = trendConfig.icon;
    const historicalYearLabels = prediction.historical.yearly_labels ?? [];
    const historicalYearScores = prediction.historical.yearly_scores ?? [];
    const forecastYearAverages = buildForecastYearAverages(
        prediction.forecast.labels ?? [],
        prediction.forecast.scores ?? [],
    );
    const yearLabels = Array.from(new Set([
        ...historicalYearLabels,
        ...Object.keys(forecastYearAverages),
    ])).sort((left, right) => Number(left) - Number(right));
    const historicalData = yearLabels.map((year) => {
        const index = historicalYearLabels.indexOf(year);

        return index >= 0 ? historicalYearScores[index] ?? null : null;
    });
    const forecastData = yearLabels.map((year) => forecastYearAverages[year] ?? null);
    const lastHistoricalYear = historicalYearLabels.at(-1);
    const lastHistoricalScore = historicalYearScores.at(-1) ?? null;

    if (lastHistoricalYear && lastHistoricalScore !== null) {
        const lastHistoricalIndex = yearLabels.indexOf(lastHistoricalYear);

        if (lastHistoricalIndex >= 0 && forecastData[lastHistoricalIndex] === null) {
            forecastData[lastHistoricalIndex] = lastHistoricalScore;
        }
    }

    return (
        <div className="space-y-4">
            <DashboardChartSurface className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-semibold">
                            <TrendingUp className="size-4 text-primary" />
                            Yearly Performance Trend
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Historical yearly averages with forecasted performance mapped onto the same year-based timeline.
                        </p>
                    </div>
                    <Badge variant="outline">X-Axis: Historical Years</Badge>
                </div>

                <MultiLineChart
                    labels={yearLabels}
                    datasets={[
                        {
                            label: 'Historical Yearly Average',
                            data: historicalData,
                            borderColor: '#4A7C3C',
                            backgroundColor: '#91C383',
                        },
                        {
                            label: 'Projected Performance',
                            data: forecastData,
                            borderColor: '#2A5A8C',
                            backgroundColor: '#4A90D9',
                            borderDash: [6, 3],
                        },
                    ]}
                />
            </DashboardChartSurface>
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge variant="outline" className={`${trendConfig.bg} ${trendConfig.color}`}>
                    <TrendIcon className="size-4" />
                    {trendConfig.label}
                </Badge>
                <span className="text-muted-foreground">
                    Historical avg: <span className="font-semibold text-foreground">{prediction.recent_avg.toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                    Forecast avg: <span className="font-semibold text-foreground">{prediction.forecast_avg.toFixed(2)}</span>
                </span>
            </div>
        </div>
    );
}
