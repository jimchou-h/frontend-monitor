import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { IssueRecord, OverviewStats, TrackSummaryRow, TrendPoint, VitalSummaryRow } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import TimeRange from '../components/TimeRange';
import KpiCard from '../components/KpiCard';
import LineChart from '../components/LineChart';
import Table, { Column } from '../components/Table';
import Panel from '../components/Panel';
import Badge, { statusBadge } from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';

export default function Overview() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<'errors' | 'tracks' | 'vitals'>('errors');
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [tracks, setTracks] = useState<TrackSummaryRow[]>([]);
  const [vitals, setVitals] = useState<VitalSummaryRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.overview(days, projectId),
      api.trend(metric, days, projectId),
      api.issues({ page: 1, size: 6, projectId }),
      api.trackSummary(days, projectId),
      api.vitalSummary(days, projectId),
    ])
      .then(([ov, tr, is, ts, vs]) => {
        if (cancelled) return;
        setOverview(ov);
        setTrend(tr);
        setIssues(is.items);
        setTracks(ts);
        setVitals(vs);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, metric, projectId]);

  const issueColumns: Column<IssueRecord>[] = [
    { key: 'title', title: 'Issue', render: (r) => <span className="cell-main">{r.title}</span> },
    { key: 'type', title: '类型', render: (r) => <Badge tone="blue">{r.errorType}</Badge> },
    { key: 'count', title: '次数', width: 80, render: (r) => <strong>{r.count}</strong> },
    { key: 'status', title: '状态', width: 90, render: (r) => statusBadge(r.status) },
    { key: 'lastSeen', title: '末次', width: 150, render: (r) => formatTime(r.lastSeen) },
  ];

  const trackColumns: Column<TrackSummaryRow>[] = [
    { key: 'trackId', title: '埋点', render: (r) => <code>{r.trackId}</code> },
    { key: 'action', title: '类型', width: 90, render: (r) => <Badge tone="gray">{r.actionType}</Badge> },
    { key: 'count', title: '次数', width: 80, render: (r) => <strong>{r.count}</strong> },
    { key: 'users', title: '用户', width: 80, render: (r) => r.users },
  ];

  if (loading && !overview) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader
        title="稳定性总览"
        description="错误、埋点与性能指标的核心数据一览"
        actions={<TimeRange value={days} onChange={setDays} />}
      />
      <div className="kpi-grid">
        <KpiCard label="错误事件" value={overview?.errors ?? 0} delta={overview?.errorsDelta} hint="近 24h 对比" tone="danger" />
        <KpiCard label="未解决 Issue" value={overview?.issues ?? 0} hint="待处理聚合问题" />
        <KpiCard label="受影响用户" value={overview?.users ?? 0} hint="去重 trackerId" />
        <KpiCard label="埋点事件" value={overview?.tracks ?? 0} delta={overview?.tracksDelta} hint="近 24h 对比" tone="success" />
      </div>

      <Panel
        title="数据趋势"
        className="trend-panel"
        extra={
          <div className="segmented">
            {(['errors', 'tracks', 'vitals'] as const).map((m) => (
              <button key={m} className={metric === m ? 'active' : ''} onClick={() => setMetric(m)}>
                {m === 'errors' ? '错误' : m === 'tracks' ? '埋点' : '性能'}
              </button>
            ))}
          </div>
        }
      >
        <LineChart points={trend} label={metric === 'errors' ? '错误数' : metric === 'tracks' ? '埋点数' : '性能条数'} />
      </Panel>

      <div className="two-col">
        <Panel title="未解决 Issue 排行">
          <Table columns={issueColumns} rows={issues} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/issues/${r.id}`)} empty="暂无 Issue" />
        </Panel>
        <Panel title="埋点事件 Top" extra={<Link className="link" to="/tracks">查看全部</Link>}>
          <Table columns={trackColumns} rows={tracks.slice(0, 6)} rowKey={(r) => r.trackId} empty="暂无埋点" />
        </Panel>
      </div>

      <Panel title="性能指标概览" extra={<Link className="link" to="/vitals">查看全部</Link>}>
        <div className="vital-grid">
          {vitals.slice(0, 5).map((v) => (
            <div key={v.name} className="vital-tile">
              <div className="vital-name">{v.name.toUpperCase()}</div>
              <div className="vital-value">{formatVitalValue(v.name, v.p75)}</div>
              <div className="vital-meta">
                P75 · {v.count} 条 · 良好率 {v.goodRate}%
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function formatTime(value: string | number): string {
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function formatVitalValue(name: string, value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (name === 'cls') return value.toFixed(3);
  if (name === 'memory_warning') return `L${Math.round(value)}`;
  return `${Math.round(value)}ms`;
}
