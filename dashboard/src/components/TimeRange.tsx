interface Props {
  value: number;
  onChange: (days: number) => void;
}

export default function TimeRange({ value, onChange }: Props) {
  return (
    <div className="segmented" role="group" aria-label="时间范围">
      {[7, 14, 30].map((days) => (
        <button key={days} className={value === days ? 'active' : ''} onClick={() => onChange(days)}>
          {days} 天
        </button>
      ))}
    </div>
  );
}
