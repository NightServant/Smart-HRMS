import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartOptions,
    LinearScale,
    type Plugin,
    Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

function colorForDoughnutText(color: string): string {
    const normalized = color.replace('#', '');

    if (normalized.length !== 6) {
        return '#0f172a';
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

    return brightness > 160 ? '#0f172a' : '#ffffff';
}

type DoughnutAnnotationMode = 'percentage-only' | 'none';

type AdminDashboardDoughnutLabelPluginOptions = {
    annotationMode?: DoughnutAnnotationMode;
    minSliceLabelRatio?: number;
    minSlicePixelArc?: number;
};

function resolveDoughnutPluginOptions(chart: ChartJS<'doughnut'>): AdminDashboardDoughnutLabelPluginOptions {
    const plugins = chart.options.plugins as ChartOptions<'doughnut'>['plugins'] & {
        adminDashboardDoughnutLabelPlugin?: AdminDashboardDoughnutLabelPluginOptions;
    };

    return plugins?.adminDashboardDoughnutLabelPlugin ?? {};
}

const adminDashboardDoughnutLabelPlugin: Plugin<'doughnut'> = {
    id: 'adminDashboardDoughnutLabelPlugin',
    afterDatasetsDraw(chart) {
        const { annotationMode = 'percentage-only', minSliceLabelRatio = 0.08, minSlicePixelArc = 28 } = resolveDoughnutPluginOptions(chart);
        const dataset = chart.data.datasets[0];
        const values = (dataset?.data ?? []).map((value) => Number(value) || 0);
        const total = values.reduce((sum, value) => sum + value, 0);
        const arcs = chart.getDatasetMeta(0).data as ArcElement[];
        const backgroundColors = Array.isArray(dataset?.backgroundColor) ? dataset.backgroundColor : [];

        if (annotationMode === 'none' || total <= 0 || arcs.length === 0) {
            return;
        }

        const chartWidth = chart.width;
        const ctx = chart.ctx;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        arcs.forEach((arc, index) => {
            const percentage = values[index] / total;
            const midRadius = (arc.innerRadius + arc.outerRadius) / 2;
            const arcLength = (arc.endAngle - arc.startAngle) * midRadius;
            const ringDepth = arc.outerRadius - arc.innerRadius;

            if (percentage < minSliceLabelRatio || arcLength < minSlicePixelArc || ringDepth < 28) {
                return;
            }

            const angle = (arc.startAngle + arc.endAngle) / 2;
            const radius = arc.innerRadius + ringDepth * 0.66;
            const x = arc.x + Math.cos(angle) * radius;
            const y = arc.y + Math.sin(angle) * radius + 1;
            const textColor = colorForDoughnutText(String(backgroundColors[index] ?? '#0f172a'));

            ctx.fillStyle = textColor;
            ctx.font = `${chartWidth < 420 ? '700 10px' : '700 11px'} Montserrat, sans-serif`;
            ctx.fillText(`${Math.round(percentage * 100)}%`, x, y);
        });

        ctx.restore();
    },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, adminDashboardDoughnutLabelPlugin);

type AdminDashboardBarDataset = {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
};

type AdminDashboardBarChartProps = {
    labels: Array<string | string[]>;
    datasets: AdminDashboardBarDataset[];
    indexAxis?: 'x' | 'y';
    className?: string;
};

type AdminDashboardDoughnutChartProps = {
    labels: Array<string | string[]>;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    annotationMode?: DoughnutAnnotationMode;
    minSliceLabelRatio?: number;
    minSlicePixelArc?: number;
    className?: string;
};

export function AdminDashboardBarChart({
    labels,
    datasets,
    indexAxis = 'x',
    className,
}: AdminDashboardBarChartProps) {
    const hasData = labels.length > 0 && datasets.some((dataset) => dataset.data.some((value) => value > 0));

    if (! hasData) {
        return (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground sm:h-72">
                No chart data available yet.
            </div>
        );
    }

    const chartData = {
        labels,
        datasets: datasets.map((dataset) => ({
            ...dataset,
            borderWidth: 0,
            borderRadius: 14,
            borderSkipped: false as const,
            hoverBorderWidth: 0,
            maxBarThickness: 30,
            categoryPercentage: 0.64,
            barPercentage: 0.82,
        })),
    };

    const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.94)',
                padding: 12,
                displayColors: true,
                cornerRadius: 16,
                titleFont: {
                    family: 'Montserrat, sans-serif',
                    weight: 700,
                },
                bodyFont: {
                    family: 'Montserrat, sans-serif',
                },
                bodySpacing: 6,
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                border: {
                    display: false,
                },
                grid: {
                    color: indexAxis === 'y' ? 'rgba(74, 124, 60, 0.08)' : 'rgba(74, 124, 60, 0.12)',
                    drawTicks: false,
                },
                ticks: {
                    precision: 0,
                    color: '#6b7280',
                    padding: 10,
                    font: (context) => ({
                        family: 'Montserrat, sans-serif',
                        size: context.chart.width < 420 ? 10 : 12,
                        weight: 500,
                    }),
                },
            },
            y: {
                border: {
                    display: false,
                },
                grid: {
                    display: indexAxis !== 'y',
                    color: 'rgba(74, 124, 60, 0.08)',
                    drawTicks: false,
                },
                ticks: {
                    color: '#6b7280',
                    padding: 10,
                    font: (context) => ({
                        family: 'Montserrat, sans-serif',
                        size: context.chart.width < 420 ? 10 : 12,
                        weight: 500,
                    }),
                },
            },
        },
    };

    return (
        <div className={cn('h-60 min-w-0 w-full sm:h-72', className)}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

export function AdminDashboardDoughnutChart({
    labels,
    data,
    backgroundColor,
    borderColor,
    annotationMode = 'percentage-only',
    minSliceLabelRatio = 0.08,
    minSlicePixelArc = 28,
    className,
}: AdminDashboardDoughnutChartProps) {
    const hasData = labels.length > 0 && data.some((value) => value > 0);

    if (! hasData) {
        return (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground sm:h-72">
                No chart data available yet.
            </div>
        );
    }

    const chartData = {
        labels,
        datasets: [
            {
                data,
                backgroundColor,
                borderColor,
                borderWidth: 0,
                hoverBorderWidth: 0,
                hoverOffset: 8,
                spacing: 2,
            },
        ],
    };

    const options: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.94)',
                padding: 12,
                displayColors: true,
                cornerRadius: 16,
                titleFont: {
                    family: 'Montserrat, sans-serif',
                    weight: 700,
                },
                bodyFont: {
                    family: 'Montserrat, sans-serif',
                },
                bodySpacing: 6,
            },
            adminDashboardDoughnutLabelPlugin: {
                annotationMode,
                minSliceLabelRatio,
                minSlicePixelArc,
            },
        } as ChartOptions<'doughnut'>['plugins'] & {
            adminDashboardDoughnutLabelPlugin: AdminDashboardDoughnutLabelPluginOptions;
        },
        elements: {
            arc: {
                borderWidth: 0,
            },
        },
    };

    return (
        <div className={cn('h-60 min-w-0 w-full sm:h-72', className)}>
            <Doughnut data={chartData} options={options} />
        </div>
    );
}
