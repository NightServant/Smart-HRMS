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

type AttendanceBreakdown = {
  late: number;
  absent: number;
  onLeave: number;
  present: number;
};

type Props = {
  data?: AttendanceBreakdown | null;
};

export function DailyAttendanceBarChart({ data }: Props) {
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
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="mx-auto h-64 w-3/4 sm:h-72 md:h-80">
      <Bar options={options} data={chartData} />
    </div>
  );
}
