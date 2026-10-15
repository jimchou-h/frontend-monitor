import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: number | string;
  delta?: number;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}

export default function KpiCard({ label, value, delta, hint, tone = 'default' }: Props) {
  const deltaNode =
    delta === undefined ? null : delta === 0 ? (
      <span className="delta flat">
        <Minus size={13} /> 持平
      </span>
    ) : (
      <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>
        {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {Math.abs(delta)}
      </span>
    );
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {deltaNode}
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    </div>
  );
}
