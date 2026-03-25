import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

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
};

export function QuarterBarChart({ quarter = 'Q1', data }: Props) {
  const employeeScores = data?.employee_scores ?? [];

  const chartData = employeeScores.length > 0
    ? {
        labels: employeeScores.map((s) => s.employee_name.split(' ')[0]),
        datasets: [
          {
            label: 'Performance Score',
            data: employeeScores.map((s) => s.final_rating),
            backgroundColor: '#4A7C3C',
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
          },
        ],
      };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="mx-auto h-40 w-full sm:h-48 md:h-56 lg:h-64">
      <Bar options={options} data={chartData} />
    </div>
  );
}
