import { useEffect, useState } from 'react';
import { api } from '../api';
import type { TrackRecord, TrackSummaryRow, TrendPoint } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import TimeRange from '../components/TimeRange';
import KpiCard from '../components/KpiCard';
import Panel from '../components/Panel';
import LineChart from '../components/LineChart';
import Table, { Column } from '../components/Table';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function Tracks() {
  const { projectId } = useProject();
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<TrackSummaryRow[]>([]);
  const [trackId, setTrackId] = useState('');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [events, setEvents] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .trackSummary(days, projectId)
      .then((rows) => {
        if (cancelled) return;
        setSummary(rows);
        setTrackId((current) => (current && rows.some((r) => r.trackId === current) ? current : rows[0]?.trackId || ''));
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, projectId]);

  useEffect(() => {
    if (!trackId) return;
    let cancelled = false;
    Promise.all([
      api.trackTrend(trackId, days, projectId),
      api.tracks({ page: 1, size: 30, trackId, projectId }),
    ])
      .then(([tr, ev]) => {
        if (cancelled) return;
        setTrend(tr);
        setEvents(ev.items);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [trackId, days, projectId]);

  const totalEvents = summary.reduce((sum, r) => sum + r.count, 0);
  const totalUsers = summary.reduce((sum, r) => sum + r.users, 0);

  const summaryColumns: Column<TrackSummaryRow>[] = [
    { key: 'trackId', title: '埋点 ID', render: (r) => <code>{r.trackId}</code> },
    { key: 'action', title: '类型', width: 120, render: (r) => <Badge tone="blue">{r.actionType}</Badge> },
    { key: 'count', title: '次数', width: 90, render: (r) => <strong>{r.count}</strong> },
    { key: 'users', title: '用户', width: 90, render: (r) => r.users },
    { key: 'last', title: '最近一次', width: 170, render: (r) => formatTime(r.lastAt) },
  ];

  const eventColumns: Column<TrackRecord>[] = [
    { key: 'time', title: '时间', width: 170, render: (r) => formatTime(r.trackTime) },
    { key: 'user', title: '用户', width: 150, render: (r) => <span className="mono">{r.trackerId}</span> },
    { key: 'page', title: '页面', render: (r) => <span className="mono">{r.page || '-'}</span> },
    { key: 'value', title: '数值', width: 90, render: (r) => r.value ?? '-' },
    { key: 'custom', title: '自定义字段', render: (r) => <span className="mono">{truncate(JSON.stringify(r.custom), 70)}</span> },
  ];

  return (
    <div>
      <PageHeader title="埋点分析" description="自定义事件、页面曝光与时长数据的趋势与明细" actions={<TimeRange value={days} onChange={setDays} />} />
      <div className="kpi-grid">
        <KpiCard label="埋点事件" value={totalEvents} hint={`${summary.length} 个埋点`} tone="success" />
        <KpiCard label="独立用户" value={totalUsers} hint="按 trackerId 统计" />
        <KpiCard label="埋点类型" value={new Set(summary.map((r) => r.actionType)).size} hint="PAGE / EVENT / VIEW / DURATION" />
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <Panel title="埋点汇总">
            <Table columns={summaryColumns} rows={summary} rowKey={(r) => r.trackId} empty="暂无埋点数据" />
          </Panel>
          <div className="two-col">
            <Panel
              title="趋势"
              className="trend-panel"
              extra={
                <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                  {summary.map((r) => (
                    <option key={r.trackId} value={r.trackId}>{r.trackId}</option>
                  ))}
                </select>
              }
            >
              <LineChart points={trend} label={trackId} color="#0e9f6e" />
            </Panel>
            <Panel title="最近事件">
              <Table columns={eventColumns} rows={events.slice(0, 12)} rowKey={(r) => r.id} empty="暂无事件" />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function truncate(value: string, max: number): string {
  return value && value.length > max ? value.slice(0, max) + '...' : value || '-';
}
