import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

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
};

export function LineChart({
  labels = [],
  data = [],
  borderColor = '#91C383',
  backgroundColor = '#4A7C3C',
  label = 'Performance Score',
}: LineChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        font: { family: 'Montserrat, sans-serif' },
        data,
        borderColor,
        backgroundColor,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        min: 1.0,
        max: 5.0,
        ticks: { stepSize: 0.5 },
      },
    },
  };

  return (
    <div className="mx-auto h-36 w-full sm:h-40 md:h-44 lg:h-48">
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}
