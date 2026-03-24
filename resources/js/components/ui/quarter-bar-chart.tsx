import { faker } from '@faker-js/faker';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
};

const quarterLabels: Record<Quarter, string[]> = {
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
};

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export function QuarterBarChart({ quarter = 'Q1' }: { quarter?: Quarter }) {
  const labels = quarterLabels[quarter];
  const chartData = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          label: 'Performance Score',
          font: {
            family: 'Montserrat, sans-serif',
          },
          data: labels.map(() => faker.number.float({ min: 0, max: 100, fractionDigits: 2 })),
          backgroundColor: '#4A7C3C',
        },
      ],
    };
  }, [labels]);

  return (
    <div className="mx-auto h-36 w-full sm:h-44 md:h-52 lg:h-60">
      <Bar options={options} data={chartData} />
    </div>
  );
}
