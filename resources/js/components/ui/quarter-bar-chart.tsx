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

const quarterLabels: Record<Quarter, string[]> = {
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
};

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

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
  quarter: string;
  average_rating: number;
  employee_scores?: EmployeeScore[];
  aggregate?: {
    total_employees: number;
    high_risk_count: number;
    satisfactory_count: number;
  };
};

type Props = {
  quarter?: Quarter;
  data?: QuarterScoresData | null;
  className?: string;
};

export function QuarterBarChart({ quarter = 'Q1', data, className }: Props) {
  const employeeScores = data?.employee_scores ?? [];
  const employeeBarColors = employeeScores.map((_, index) => employeeBarPalette[index % employeeBarPalette.length]);

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
        labels: quarterLabels[quarter],
        datasets: [
          {
            label: 'Performance Score',
            data: [0, 0, 0],
            backgroundColor: '#4A7C3C',
            borderColor: '#4A7C3C',
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
        max: 5,
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
