import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { IssueRecord } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import Table, { Column } from '../components/Table';
import Badge, { statusBadge } from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function Issues() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const [rows, setRows] = useState<IssueRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('0');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .issues({ page, size: 20, projectId, status: status === '' ? undefined : Number(status), q: q || undefined })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setTotal(res.total);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, projectId, status, q]);

  const columns: Column<IssueRecord>[] = [
    {
      key: 'title',
      title: 'Issue',
      render: (r) => (
        <div className="cell-main">
          <strong>{truncate(r.title, 110)}</strong>
          <span className="cell-sub mono">{r.fingerprint}</span>
        </div>
      ),
    },
    { key: 'type', title: '类型', width: 150, render: (r) => <Badge tone="blue">{r.errorType}</Badge> },
    { key: 'level', title: '级别', width: 80, render: (r) => <Badge tone={r.level === 'error' ? 'red' : 'amber'}>{r.level}</Badge> },
    { key: 'count', title: '次数', width: 80, render: (r) => <strong>{r.count}</strong> },
    { key: 'first', title: '首次', width: 160, render: (r) => formatTime(r.firstSeen) },
    { key: 'last', title: '末次', width: 160, render: (r) => formatTime(r.lastSeen) },
    { key: 'status', title: '状态', width: 90, render: (r) => statusBadge(r.status) },
  ];

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <PageHeader title="Issue 聚合" description="按指纹聚合的同类错误，用于定位和跟进问题" />
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="0">未解决</option>
          <option value="1">已解决</option>
          <option value="2">已忽略</option>
          <option value="">全部状态</option>
        </select>
        <input placeholder="搜索 Issue 标题 / 消息" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <div className="spacer" />
        <span className="muted">共 {total} 个 Issue</span>
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/issues/${r.id}`)} />
          <div className="pager">
            <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
            <span>{page} / {totalPages}</span>
            <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
          </div>
        </>
      )}
    </div>
  );
}

function truncate(value: string, max: number): string {
  return value && value.length > max ? value.slice(0, max) + '...' : value || '-';
}
