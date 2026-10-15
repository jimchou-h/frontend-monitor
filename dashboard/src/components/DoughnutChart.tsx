import { Doughnut } from 'react-chartjs-2';

export interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DoughnutSlice[];
  height?: number;
}

export default function DoughnutChart({ slices, height = 240 }: Props) {
  const data = {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => s.value),
        backgroundColor: slices.map((s) => s.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
              },
            },
          },
        }}
      />
    </div>
  );
}
