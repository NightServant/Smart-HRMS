import { ArcElement, Chart as ChartJS, Legend, Tooltip, type ChartOptions } from 'chart.js';
import type { Plugin } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
    CHART_TOOLTIP_CONFIG,
    colorForDoughnutText,
} from '@/components/admin-system-dashboard-charts';
import { cn } from '@/lib/utils';

export const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const values = (dataset?.data ?? []).map((value) => Number(value) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const arcs = chart.getDatasetMeta(0).data as ArcElement[];
    const backgroundColors = Array.isArray(dataset?.backgroundColor) ? dataset.backgroundColor : [];

    if (total <= 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chartWidth = chart.width;

    arcs.forEach((arc, index) => {
      const percentage = (values[index] / total) * 100;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.58;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;

      ctx.fillStyle = colorForDoughnutText(String(backgroundColors[index] ?? '#0f172a'));
      ctx.font = `${chartWidth < 420 ? '700 10px' : '600 14px'} Montserrat, sans-serif`;
      ctx.fillText(`${percentage.toFixed(0)}%`, x, y);
    });

    ctx.restore();
  }
};

ChartJS.register(ArcElement, Tooltip, Legend, centerTextPlugin);

type DoughnutChartProps = {
  data?: { lowRisk: number; highRisk: number } | null;
  className?: string;
};

export function DoughnutChart({ data, className }: DoughnutChartProps) {
  const lowRisk = data?.lowRisk ?? 0;
  const highRisk = data?.highRisk ?? 0;
  const hasData = lowRisk > 0 || highRisk > 0;
  const chartKey = `${lowRisk}-${highRisk}`;

  if (!hasData) {
    return (
      <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground sm:h-72">
        No chart data available yet.
      </div>
    );
  }

  const chartData = {
    labels: ['Low Risk', 'High Risk'],
    datasets: [
      {
        label: 'Performance Data',
        data: [lowRisk, highRisk],
        backgroundColor: ['#4A7C3C', '#EE4B2B'],
        borderColor: ['#4A7C3C', '#EE4B2B'],
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
      legend: { display: false },
      title: { display: false },
      tooltip: CHART_TOOLTIP_CONFIG,
    },
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
  };

  return (
    <div className={cn('h-60 min-w-0 w-full sm:h-72', className)}>
      <Doughnut key={chartKey} redraw options={options} data={chartData} />
    </div>
  );
}
