import { Line } from 'react-chartjs-2';
import type { TrendPoint } from '../types';

interface Props {
  points: TrendPoint[];
  label?: string;
  color?: string;
  height?: number;
  valueKey?: 'count' | 'p75' | 'avg';
  formatY?: (value: number) => string;
}

export default function LineChart({
  points,
  label = '数量',
  color = '#2563eb',
  height = 260,
  valueKey = 'count',
  formatY,
}: Props) {
  const data = {
    labels: points.map((p) => p.date.slice(5)),
    datasets: [
      {
        label,
        data: points.map((p) => Number(p[valueKey] ?? 0)),
        borderColor: color,
        backgroundColor: color + '1a',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${label}: ${formatY ? formatY(Number(ctx.parsed.y)) : ctx.parsed.y}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: formatY ? undefined : 0,
                callback: (value) => (formatY ? formatY(Number(value)) : value),
              },
              grid: { color: '#eef1f6' },
            },
            x: { grid: { display: false } },
          },
        }}
      />
    </div>
  );
}
