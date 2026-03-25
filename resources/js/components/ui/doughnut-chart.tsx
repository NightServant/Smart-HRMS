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

type DoughnutChartProps = {
  data?: { lowRisk: number; highRisk: number } | null;
};

export function DoughnutChart({ data }: DoughnutChartProps) {
  const lowRisk = data?.lowRisk ?? 0;
  const highRisk = data?.highRisk ?? 0;
  const hasData = lowRisk > 0 || highRisk > 0;
  const chartKey = `${lowRisk}-${highRisk}`;

  const chartData = {
    labels: ['Low Risk', 'High Risk'],
    datasets: [
      {
        label: 'Performance Data',
        data: hasData ? [lowRisk, highRisk] : [1, 0],
        backgroundColor: ['#4A7C3C', '#EE4B2B'],
        borderColor: ['#345A2A', '#EE4B2B'],
        borderRadius: 0,
        borderWidth: 0,
        hoverBorderWidth: 0,
        hoverOffset: 0,
        spacing: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    elements: {
      arc: {
        borderRadius: 0,
        borderWidth: 0,
      },
    },
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[15rem] [&>canvas]:!rounded-none sm:max-w-48 md:max-w-56 lg:max-w-64">
      <Doughnut key={chartKey} redraw options={options} data={chartData} />
    </div>
  );
}
