import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
    CHART_GRID_COLOR,
    CHART_TICK_COLOR,
    CHART_TICK_FONT,
    CHART_TOOLTIP_CONFIG,
} from '@/components/admin-system-dashboard-charts';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type LineChartProps = {
  labels?: string[];
  data?: number[];
  borderColor?: string;
  backgroundColor?: string;
  label?: string;
  className?: string;
};

export function LineChart({
  labels = [],
  data = [],
  borderColor = '#91C383',
  backgroundColor = '#4A7C3C',
  label = 'Performance Score',
  className,
}: LineChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor,
        backgroundColor,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: CHART_TOOLTIP_CONFIG,
    },
    scales: {
      x: {
        border: { display: false },
        grid: { color: CHART_GRID_COLOR, drawTicks: false },
        ticks: {
          color: CHART_TICK_COLOR,
          padding: 10,
          font: CHART_TICK_FONT,
        },
      },
      y: {
        min: 1.0,
        max: 5.0,
        border: { display: false },
        grid: { color: CHART_GRID_COLOR, drawTicks: false },
        ticks: {
          stepSize: 0.5,
          color: CHART_TICK_COLOR,
          padding: 10,
          font: CHART_TICK_FONT,
        },
      },
    },
  };

  return (
    <div className={cn('h-60 min-w-0 w-full sm:h-72', className)}>
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}
