import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { TrendPoint, VitalPageRow, VitalSummaryRow } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import TimeRange from '../components/TimeRange';
import Panel from '../components/Panel';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';
import DoughnutChart from '../components/DoughnutChart';
import Table, { Column } from '../components/Table';
import Badge, { ratingBadge } from '../components/Badge';
import KpiCard from '../components/KpiCard';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatVitalValue } from './Overview';

const METRIC_LABELS: Record<string, string> = {
  lcp: '最大内容绘制',
  inp: '交互延迟',
  cls: '布局偏移',
  fcp: '首次内容绘制',
  ttfb: '首字节时间',
  navigation: '页面导航',
  resource: '资源耗时',
  memory_warning: '内存告警',
};

const METRIC_COLORS: Record<string, string> = {
  lcp: '#7c3aed',
  inp: '#2563eb',
  cls: '#0e9f6e',
  fcp: '#d97706',
  ttfb: '#db2777',
  navigation: '#0891b2',
  resource: '#4f46e5',
  memory_warning: '#b91c1c',
};

export default function Vitals() {
  const { projectId } = useProject();
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<VitalSummaryRow[]>([]);
  const [metric, setMetric] = useState('lcp');
  const [trendMode, setTrendMode] = useState<'p75' | 'count'>('p75');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pages, setPages] = useState<VitalPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .vitalSummary(days, projectId)
      .then((rows) => {
        if (cancelled) return;
        setSummary(rows);
        setMetric((current) => (rows.some((r) => r.name === current) ? current : rows[0]?.name || 'lcp'));
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, projectId]);

  useEffect(() => {
    if (!metric) return;
    let cancelled = false;
    Promise.all([api.vitalTrend(metric, days, projectId), api.vitalPages(metric, days, projectId)])
      .then(([trendRows, pageRows]) => {
        if (cancelled) return;
        setTrend(trendRows);
        setPages(pageRows);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [metric, days, projectId]);

  const totalSamples = summary.reduce((sum, row) => sum + row.count, 0);
  const weightedGood = summary.reduce((sum, row) => sum + (row.count * row.goodRate) / 100, 0);
  const weightedPoor = summary.reduce((sum, row) => sum + (row.count * row.poorRate) / 100, 0);
  const avgGoodRate = totalSamples ? Math.round((weightedGood / totalSamples) * 1000) / 10 : 0;
  const avgPoorRate = totalSamples ? Math.round((weightedPoor / totalSamples) * 1000) / 10 : 0;
  const selected = summary.find((row) => row.name === metric);
  const metricColor = METRIC_COLORS[metric] || '#7c3aed';
  const pageChartRows = pages.slice(0, 8);

  const ratingSlices = useMemo(() => {
    if (!selected) return [];
    const good = Math.round((selected.count * selected.goodRate) / 100);
    const needs = Math.round((selected.count * selected.needsImprovementRate) / 100);
    const poor = Math.max(0, selected.count - good - needs);
    return [
      { label: `良好 ${selected.goodRate}%`, value: good, color: '#22c55e' },
      { label: `需优化 ${selected.needsImprovementRate}%`, value: needs, color: '#f59e0b' },
      { label: `较差 ${selected.poorRate}%`, value: poor, color: '#ef4444' },
    ].filter((slice) => slice.value > 0);
  }, [selected]);

  const columns: Column<VitalSummaryRow>[] = [
    {
      key: 'name',
      title: '指标',
      width: 180,
      render: (r) => (
        <div className="cell-main">
          <code>{r.name.toUpperCase()}</code>
          <span className="cell-sub">{METRIC_LABELS[r.name] || r.name}</span>
        </div>
      ),
    },
    { key: 'count', title: '样本', width: 80, render: (r) => r.count },
    { key: 'avg', title: '平均', width: 100, render: (r) => formatVitalValue(r.name, r.avg) },
    { key: 'p75', title: 'P75', width: 100, render: (r) => <strong>{formatVitalValue(r.name, r.p75)}</strong> },
    {
      key: 'dist',
      title: '体验分布',
      render: (r) => <RatingBar good={r.goodRate} needs={r.needsImprovementRate} poor={r.poorRate} />,
    },
    { key: 'good', title: '良好', width: 80, render: (r) => <Badge tone="green">{r.goodRate}%</Badge> },
    { key: 'rating', title: '体验', width: 90, render: (r) => ratingBadge(overallRating(r)) },
  ];

  const pageColumns: Column<VitalPageRow>[] = [
    { key: 'page', title: '页面', render: (r) => <span className="mono">{r.page}</span> },
    { key: 'count', title: '样本', width: 80, render: (r) => r.count },
    { key: 'p75', title: 'P75', width: 100, render: (r) => <strong>{formatVitalValue(metric, r.p75)}</strong> },
    { key: 'good', title: '良好率', width: 90, render: (r) => <Badge tone="green">{r.goodRate}%</Badge> },
    { key: 'poor', title: '较差率', width: 90, render: (r) => <Badge tone={r.poorRate > 20 ? 'red' : 'amber'}>{r.poorRate}%</Badge> },
  ];

  return (
    <div>
      <PageHeader title="性能指标" description="LCP / INP / CLS 等核心指标的分布、趋势与页面维度" actions={<TimeRange value={days} onChange={setDays} />} />
      {error && <ErrorBox message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard label="性能样本" value={totalSamples} hint={`${summary.length} 项指标`} />
            <KpiCard label="平均良好率" value={`${avgGoodRate}%`} hint="按样本量加权" tone="success" />
            <KpiCard label="较差占比" value={`${avgPoorRate}%`} hint="需优先治理" tone={avgPoorRate > 20 ? 'danger' : 'default'} />
            <KpiCard
              label={`${metric.toUpperCase()} P75`}
              value={selected ? formatVitalValue(metric, selected.p75) : '-'}
              hint={METRIC_LABELS[metric] || metric}
            />
          </div>

          <Panel title="核心指标 P75">
            {summary.length ? (
              <div className="vital-grid">
                {summary.map((row) => (
                  <button
                    key={row.name}
                    type="button"
                    className={`vital-tile${row.name === metric ? ' active' : ''}`}
                    onClick={() => setMetric(row.name)}
                  >
                    <div className="vital-name">{row.name.toUpperCase()}</div>
                    <div className="vital-value">{formatVitalValue(row.name, row.p75)}</div>
                    <div className="vital-meta">
                      {METRIC_LABELS[row.name] || row.name} · {row.count} 条
                    </div>
                    <RatingBar good={row.goodRate} needs={row.needsImprovementRate} poor={row.poorRate} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="table-empty">暂无性能数据</div>
            )}
          </Panel>

          <div className="two-col">
            <Panel title="各指标体验分布">
              <BarChart
                labels={summary.map((row) => row.name.toUpperCase())}
                stacked
                max={100}
                yPrecision={0}
                series={[
                  { label: '良好', values: summary.map((row) => row.goodRate), color: '#22c55e' },
                  { label: '需优化', values: summary.map((row) => row.needsImprovementRate), color: '#f59e0b' },
                  { label: '较差', values: summary.map((row) => row.poorRate), color: '#ef4444' },
                ]}
              />
            </Panel>
            <Panel title={`${metric.toUpperCase()} 评级构成`} extra={<span className="muted">{selected ? `${selected.count} 条样本` : ''}</span>}>
              {ratingSlices.length ? <DoughnutChart slices={ratingSlices} /> : <div className="table-empty">暂无分布数据</div>}
            </Panel>
          </div>

          <Panel
            title="趋势"
            className="trend-panel"
            extra={
              <div className="panel-extra">
                <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {summary.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="segmented">
                  <button className={trendMode === 'p75' ? 'active' : ''} onClick={() => setTrendMode('p75')}>
                    P75
                  </button>
                  <button className={trendMode === 'count' ? 'active' : ''} onClick={() => setTrendMode('count')}>
                    样本量
                  </button>
                </div>
              </div>
            }
          >
            <LineChart
              points={trend}
              label={trendMode === 'p75' ? `${metric.toUpperCase()} P75` : '样本量'}
              color={metricColor}
              valueKey={trendMode}
              formatY={trendMode === 'p75' ? (value) => formatVitalValue(metric, value) : undefined}
            />
          </Panel>

          <div className="two-col">
            <Panel title="良好率对比">
              <BarChart
                labels={summary.map((row) => row.name.toUpperCase())}
                values={summary.map((row) => row.goodRate)}
                label="良好率 %"
                color="#0e9f6e"
                max={100}
              />
            </Panel>
            <Panel title={`${metric.toUpperCase()} 最慢页面`} extra={<span className="muted">按 P75 排序</span>}>
              {pageChartRows.length ? (
                <BarChart
                  labels={pageChartRows.map((row) => shortPage(row.page))}
                  values={pageChartRows.map((row) => row.p75)}
                  label={`${metric.toUpperCase()} P75`}
                  color={metricColor}
                  horizontal
                  yPrecision={metric === 'cls' ? 3 : 0}
                />
              ) : (
                <div className="table-empty">暂无页面数据</div>
              )}
            </Panel>
          </div>

          <Panel title="页面明细">
            <Table columns={pageColumns} rows={pages} rowKey={(r) => r.page} empty="暂无页面数据" />
          </Panel>

          <Panel title="指标明细">
            <Table columns={columns} rows={summary} rowKey={(r) => r.name} empty="暂无性能数据" />
          </Panel>
        </>
      )}
    </div>
  );
}

function overallRating(row: VitalSummaryRow): string {
  if (row.goodRate >= 70) return 'good';
  if (row.poorRate > 20) return 'poor';
  return 'needs-improvement';
}

function RatingBar({ good, needs, poor }: { good: number; needs: number; poor: number }) {
  return (
    <div className="rating-bar" title={`良好 ${good}% / 需优化 ${needs}% / 较差 ${poor}%`}>
      <span className="good" style={{ width: `${good}%` }} />
      <span className="needs" style={{ width: `${needs}%` }} />
      <span className="poor" style={{ width: `${poor}%` }} />
    </div>
  );
}

function shortPage(page: string): string {
  try {
    const url = new URL(page);
    return url.pathname || page;
  } catch (_e) {
    return page.length > 24 ? `…${page.slice(-23)}` : page;
  }
}
