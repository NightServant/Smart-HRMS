import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    type ChartOptions,
    type Plugin,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip);

type SpeedometerGaugeProps = {
    score: number;
    maxScore?: number;
    className?: string;
};

export function SpeedometerGauge({
    score,
    maxScore = 5,
    className,
}: SpeedometerGaugeProps) {
    const clampedScore = Math.max(1, Math.min(score, maxScore));

    // Segments: red (1-2), yellow (2-3), green (3-5)
    const segments = [1, 1, 2]; // widths on 1-5 scale (total 4 units)
    const segmentColors = [
        'rgba(239, 68, 68, 0.7)',   // red
        'rgba(234, 179, 8, 0.7)',   // yellow
        'rgba(34, 197, 94, 0.7)',   // green
    ];

    // Needle position as fraction of total arc (0 to 1)
    const needleFraction = (clampedScore - 1) / (maxScore - 1);

    const data = {
        datasets: [
            {
                data: segments,
                backgroundColor: segmentColors,
                borderWidth: 0,
                circumference: 180,
                rotation: -90,
            },
        ],
    };

    const options: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            tooltip: { enabled: false },
            legend: { display: false },
        },
    };

    const centerTextPlugin: Plugin<'doughnut'> = {
        id: 'centerText',
        afterDraw(chart) {
            const { ctx, chartArea } = chart;
            const meta = chart.getDatasetMeta(0);
            if (!meta.data.length) return;

            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = chartArea.bottom;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = (chart.options.color as string) || '#333';
            ctx.font = 'bold 1.5rem system-ui, -apple-system, sans-serif';
            ctx.fillText(clampedScore.toFixed(2), centerX, centerY - 8);
            ctx.font = '0.75rem system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText('out of 5.0', centerX, centerY + 14);
            ctx.restore();
        },
    };

    const needlePlugin: Plugin<'doughnut'> = {
        id: 'needleGauge',
        afterDatasetDraw(chart) {
            const { ctx, chartArea } = chart;
            const meta = chart.getDatasetMeta(0);
            if (!meta.data.length) return;

            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = chartArea.bottom;
            const radius =
                (Math.min(
                    chartArea.right - chartArea.left,
                    chartArea.bottom - chartArea.top,
                ) /
                    2) *
                0.65;

            const angle = Math.PI + needleFraction * Math.PI;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -3);
            ctx.lineTo(radius, 0);
            ctx.lineTo(0, 3);
            ctx.closePath();
            ctx.fillStyle = '#374151';
            ctx.fill();

            // Draw center dot
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#374151';
            ctx.fill();
            ctx.restore();
        },
    };

    return (
        <div className={cn('relative h-40 w-full', className)}>
            <Doughnut
                data={data}
                options={options}
                plugins={[needlePlugin, centerTextPlugin]}
            />
        </div>
    );
}
