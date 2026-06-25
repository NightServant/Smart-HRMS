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

const employeeBarPalette = [
  { background: '#4A7C3C', border: '#4A7C3C' },
  { background: '#2A6F97', border: '#2A6F97' },
  { background: '#FF0056', border: '#FF0056' },
  { background: '#C89C3D', border: '#C89C3D' },
  { background: '#6B5BDB', border: '#6B5BDB' },
  { background: '#009688', border: '#009688' },
  { background: '#F97316', border: '#F97316' },
  { background: '#808080', border: '#808080' },
];

type EmployeeScore = {
  employee_name: string;
  final_rating: number;
};

type QuarterScoresData = {
  year?: number | null;
  period?: string;
  average_rating: number;
  employee_scores?: EmployeeScore[];
  aggregate?: {
    total_employees: number;
    high_risk_count: number;
    satisfactory_count: number;
  };
};

type Props = {
  data?: QuarterScoresData | null;
  className?: string;
};

export function QuarterBarChart({ data, className }: Props) {
  const employeeScores = data?.employee_scores ?? [];
  const employeeBarColors = employeeScores.map((_, index) => employeeBarPalette[index % employeeBarPalette.length]);
  const highestScore = employeeScores.reduce((max, score) => Math.max(max, score.final_rating), 0);
  const yAxisMax = highestScore > 5 ? Math.ceil(highestScore / 10) * 10 : 5;

  const chartData = employeeScores.length > 0
    ? {
        labels: employeeScores.map((s) => s.employee_name.split(' ')[0]),
        datasets: [
          {
            label: 'Performance Score',
            data: employeeScores.map((s) => s.final_rating),
            backgroundColor: employeeBarColors.map((color) => color.background),
            borderColor: employeeBarColors.map((color) => color.border),
            ...BAR_DATASET_DEFAULTS,
          },
        ],
      }
    : {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Performance Score',
            data: [0],
            backgroundColor: '#94a3b8',
            borderColor: '#94a3b8',
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
        min: 0,
        max: yAxisMax,
        border: { display: false },
        grid: { color: CHART_GRID_COLOR, drawTicks: false },
        ticks: {
          stepSize: yAxisMax > 5 ? Math.max(10, Math.ceil(yAxisMax / 5)) : 1,
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
