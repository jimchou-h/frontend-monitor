import { Bar } from 'react-chartjs-2';

export interface BarSeries {
  label: string;
  values: number[];
  color: string;
}

interface Props {
  labels: string[];
  values?: number[];
  series?: BarSeries[];
  label?: string;
  color?: string;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  max?: number;
  yPrecision?: number;
}

export default function BarChart({
  labels,
  values = [],
  series,
  label = '次数',
  color = '#2563eb',
  height = 240,
  stacked = false,
  horizontal = false,
  max,
  yPrecision = 0,
}: Props) {
  const datasets = series
    ? series.map((item) => ({
        label: item.label,
        data: item.values,
        backgroundColor: item.color,
        borderRadius: stacked ? 0 : 4,
        maxBarThickness: stacked ? 28 : 34,
        stack: stacked ? 'stack' : undefined,
      }))
    : [
        {
          label,
          data: values,
          backgroundColor: color + 'cc',
          borderRadius: 4,
          maxBarThickness: 34,
        },
      ];

  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets }}
        options={{
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: Boolean(series && series.length > 1) } },
          scales: {
            x: {
              stacked,
              beginAtZero: true,
              max: horizontal ? max : undefined,
              ticks: { precision: yPrecision },
              grid: { display: horizontal, color: '#eef1f6' },
            },
            y: {
              stacked,
              beginAtZero: true,
              max: horizontal ? undefined : max,
              ticks: { precision: yPrecision },
              grid: { display: !horizontal, color: '#eef1f6' },
            },
          },
        }}
      />
    </div>
  );
}
