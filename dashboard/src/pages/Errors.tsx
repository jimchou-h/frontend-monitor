import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../api';
import type { ErrorRecord } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import Table, { Column } from '../components/Table';
import Badge, { statusBadge } from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

const ERROR_TYPES = ['JAVASCRIPT_ERROR', 'HTTP_ERROR', 'PROMISE_ERROR', 'RESOURCE_ERROR', 'ROUTE_ERROR', 'LOG_ERROR'];

export default function Errors() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ErrorRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .errors({ page, size: 20, projectId, type: type || undefined, status: status === '' ? undefined : Number(status), q: search || undefined })
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
  }, [page, projectId, type, status, search]);

  const columns: Column<ErrorRecord>[] = [
    { key: 'time', title: '时间', width: 160, render: (r) => formatTime(r.createdAt) },
    { key: 'type', title: '类型', width: 150, render: (r) => <Badge tone="blue">{r.errorType}</Badge> },
    {
      key: 'message',
      title: '错误信息',
      render: (r) => (
        <div className="cell-main">
          <strong>{r.name}</strong>
          <span className="cell-sub">{truncate(r.message, 90)}</span>
        </div>
      ),
    },
    { key: 'page', title: '页面', render: (r) => <span className="mono">{truncate(r.page, 42)}</span> },
    { key: 'sourceMap', title: '映射', width: 80, render: (r) => (r.sourceMapApplied ? <Badge tone="green">已还原</Badge> : <Badge tone="gray">未还原</Badge>) },
    { key: 'status', title: '状态', width: 90, render: (r) => statusBadge(r.status) },
  ];

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <PageHeader title="错误明细" description="按时间倒序查看所有上报的错误事件" />
      <div className="toolbar">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">全部类型</option>
          {ERROR_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="0">未解决</option>
          <option value="1">已解决</option>
          <option value="2">已忽略</option>
        </select>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="搜索消息 / 名称 / 页面"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setSearch(q), setPage(1))}
          />
        </div>
        <div className="spacer" />
        <span className="muted">共 {total} 条</span>
      </div>
      {error && <ErrorBox message={error} onRetry={() => setPage((p) => p)} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <Table columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/errors/${r.id}`)} />
          <div className="pager">
            <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function truncate(value: string, max: number): string {
  return value && value.length > max ? value.slice(0, max) + '...' : value || '-';
}
