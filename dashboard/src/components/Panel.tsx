import { ReactNode } from 'react';

interface Props {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, extra, children, className = '' }: Props) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <h3>{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}
