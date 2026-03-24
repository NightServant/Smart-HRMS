import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type { Plugin } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

export const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const values = (dataset?.data ?? []).map((value) => Number(value) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const arcs = chart.getDatasetMeta(0).data as ArcElement[];

    if (total <= 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 14px Montserrat, sans-serif';
    ctx.fillStyle = '#FEFEFE';

    arcs.forEach((arc, index) => {
      const percentage = (values[index] / total) * 100;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.58;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;

      ctx.fillText(`${percentage.toFixed(0)}%`, x, y);
    });

    ctx.restore();
  }
};

ChartJS.register(ArcElement, Tooltip, Legend, centerTextPlugin);

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
};

export const data = {
  labels: ['Low Risk', 'High Risk'],
  datasets: [
    {
      label: 'Performance Data',
      data: [70, 30],
      backgroundColor: [
        '#4A7C3C',
        '#EE4B2B',
      ],
      borderColor: [
        '#345A2A',
        '#EE4B2B',
      ],
      borderWidth: 1,
      offset: 5,
      borderRadius: 20,
    },
  ],
};

/**
 * A doughnut chart component.
 *
 * @returns {JSX.Element} A JSX element representing the doughnut chart.
 */
export function DoughnutChart() {
  return (
    <div className="relative mx-auto h-40 w-full max-w-[15rem] sm:h-48 sm:max-w-sm md:h-56 md:max-w-md lg:h-64 lg:max-w-lg">
      <Doughnut options={options} data={data} />
    </div>
  );
}
