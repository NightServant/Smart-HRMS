import { ArrowDown, ArrowRight, ArrowUp, Loader2, TrendingUp, ChartLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <div className="flex flex-col items-center justify-center gap-1 py-12 text-muted-foreground">
                <ChartLine className="size-8 opacity-40" />
                <p className="text-sm">
                    {prediction?.notification ?? 'Insufficient historical data for prediction.'}
                </p>
            </div>
        );
    }

    const trendConfig = {
        IMPROVING: { icon: ArrowUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', label: 'Improving' },
        DECLINING: { icon: ArrowDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', label: 'Declining' },
        STABLE: { icon: ArrowRight, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Stable' },
    }[prediction.trend] ?? { icon: ArrowRight, color: 'text-muted-foreground', bg: 'bg-muted', label: prediction.trend };

    const TrendIcon = trendConfig.icon;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Card className="glass-card h-full w-full min-w-0 bg-card hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <TrendingUp className="size-4 text-primary" />
                            Historical Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0 pt-0">
                        <div className="mx-auto w-full min-w-0">
                            <LineChart
                                labels={prediction.historical.yearly_labels}
                                data={prediction.historical.yearly_scores}
                                borderColor="#91C383"
                                backgroundColor="#4A7C3C"
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card h-full w-full min-w-0 bg-card hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ChartLine className="size-4 text-primary" />
                            Projected Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0 pt-0">
                        <div className="mx-auto w-full min-w-0">
                            <LineChart
                                labels={prediction.forecast.labels}
                                data={prediction.forecast.scores}
                                borderColor="#4A90D9"
                                backgroundColor="#2A5A8C"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${trendConfig.bg} ${trendConfig.color}`}>
                    <TrendIcon className="size-4" />
                    {trendConfig.label}
                </div>
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
