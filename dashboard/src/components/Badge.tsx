interface Props {
  children: React.ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'gray';
}

export default function Badge({ children, tone = 'default' }: Props) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function statusBadge(status: number): React.ReactNode {
  if (status === 1) return <Badge tone="green">已解决</Badge>;
  if (status === 2) return <Badge tone="gray">已忽略</Badge>;
  return <Badge tone="red">未解决</Badge>;
}

export function ratingBadge(rating: string): React.ReactNode {
  if (rating === 'good') return <Badge tone="green">良好</Badge>;
  if (rating === 'needs-improvement') return <Badge tone="amber">需优化</Badge>;
  return <Badge tone="red">较差</Badge>;
}
