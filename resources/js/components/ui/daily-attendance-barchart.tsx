import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
    BAR_DATASET_DEFAULTS,
    CHART_GRID_COLOR,
    CHART_TICK_COLOR,
    CHART_TICK_FONT,
    CHART_TOOLTIP_CONFIG,
} from '@/components/admin-system-dashboard-charts';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type AttendanceBreakdown = {
  late: number;
  absent: number;
  onLeave: number;
  present: number;
};

type Props = {
  data?: AttendanceBreakdown | null;
  className?: string;
};

export function DailyAttendanceBarChart({ data, className }: Props) {
  const chartData = {
    labels: ['Late', 'Absentees', 'On Leave', 'Present'],
    datasets: [
      {
        label: 'Daily Logs',
        data: [
          data?.late ?? 0,
          data?.absent ?? 0,
          data?.onLeave ?? 0,
          data?.present ?? 0,
        ],
        backgroundColor: [
          '#C89C3D',
          '#FF0056',
          '#808080',
          '#4A7C3C',
        ],
        ...BAR_DATASET_DEFAULTS,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
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
        beginAtZero: true,
        border: { display: false },
        grid: { color: CHART_GRID_COLOR, drawTicks: false },
        ticks: {
          stepSize: 1,
          color: CHART_TICK_COLOR,
          padding: 10,
          font: CHART_TICK_FONT,
        },
      },
    },
  };

  return (
    <div className={cn('h-60 min-w-0 w-full sm:h-72', className)}>
      <Bar options={options} data={chartData} />
    </div>
  );
}
