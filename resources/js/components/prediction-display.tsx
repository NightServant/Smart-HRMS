import { ArrowDown, ArrowRight, ArrowUp, ChartLine, Loader2, TrendingUp } from 'lucide-react';
import { DashboardChartSurface } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { LineChart } from '@/components/ui/line-chart';

export type PredictionResult = {
    status: string;
    employee_name: string;
    notification?: string;
    historical: { labels: string[]; scores: number[]; yearly_labels: string[]; yearly_scores: number[] };
    forecast: { labels: string[]; scores: number[] };
    trend: string;
    recent_avg: number;
    forecast_avg: number;
    coefficients: Record<string, number>;
};

type Props = {
    prediction: PredictionResult | null;
    loading: boolean;
};

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

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <DashboardChartSurface className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                        <TrendingUp className="size-4 text-primary" />
                        Historical Performance
                    </p>
                    <LineChart
                        labels={prediction.historical.yearly_labels}
                        data={prediction.historical.yearly_scores}
                        borderColor="#91C383"
                        backgroundColor="#4A7C3C"
                    />
                </DashboardChartSurface>
                <DashboardChartSurface className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                        <ChartLine className="size-4 text-primary" />
                        Projected Performance
                    </p>
                    <LineChart
                        labels={prediction.forecast.labels}
                        data={prediction.forecast.scores}
                        borderColor="#4A90D9"
                        backgroundColor="#2A5A8C"
                    />
                </DashboardChartSurface>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge variant="outline" className={`${trendConfig.bg} ${trendConfig.color}`}>
                    <TrendIcon className="size-4" />
                    {trendConfig.label}
                </Badge>
                <span className="text-muted-foreground">
                    Recent avg: <span className="font-semibold text-foreground">{prediction.recent_avg.toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                    Forecast avg: <span className="font-semibold text-foreground">{prediction.forecast_avg.toFixed(2)}</span>
                </span>
            </div>
        </div>
    );
}
