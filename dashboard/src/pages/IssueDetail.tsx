import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, EyeOff, Undo2 } from 'lucide-react';
import { api } from '../api';
import type { ErrorRecord, IssueRecord } from '../types';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import Badge, { statusBadge } from '../components/Badge';
import Table, { Column } from '../components/Table';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<IssueRecord | null>(null);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    api
      .issue(id!)
      .then((res) => {
        setIssue(res.issue);
        setErrors(res.errors.items);
        setError('');
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const updateStatus = async (status: number) => {
    try {
      await api.updateIssue(id!, status);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (error && !issue) return <ErrorBox message={error} onRetry={load} />;
  if (!issue) return <Loading />;

  const columns: Column<ErrorRecord>[] = [
    { key: 'time', title: '时间', width: 160, render: (r) => formatTime(r.createdAt) },
    { key: 'message', title: '错误信息', render: (r) => <span className="mono">{truncate(r.message, 80)}</span> },
    { key: 'user', title: '用户', width: 140, render: (r) => <span className="mono">{r.trackerId}</span> },
    { key: 'page', title: '页面', render: (r) => <span className="mono">{truncate(r.page, 40)}</span> },
    { key: 'status', title: '状态', width: 90, render: (r) => statusBadge(r.status) },
  ];

  return (
    <div>
      <PageHeader
        title="Issue 详情"
        description={`#${issue.id} · 指纹 ${issue.fingerprint}`}
        actions={
          <div className="btn-row">
            <Link className="btn ghost" to="/issues"><ArrowLeft size={15} /> 返回</Link>
            {issue.status !== 1 && <button className="btn" onClick={() => updateStatus(1)}><CheckCircle2 size={15} /> 标记解决</button>}
            {issue.status !== 2 && <button className="btn ghost" onClick={() => updateStatus(2)}><EyeOff size={15} /> 忽略</button>}
            {issue.status !== 0 && <button className="btn ghost" onClick={() => updateStatus(0)}><Undo2 size={15} /> 恢复</button>}
          </div>
        }
      />
      <div className="detail-head">
        <div>
          <div className="detail-title-row">
            <Badge tone="blue">{issue.errorType}</Badge>
            {statusBadge(issue.status)}
            <Badge tone="gray">共 {issue.count} 次</Badge>
          </div>
          <h2>{issue.title}</h2>
          <p className="detail-message">{issue.message}</p>
        </div>
        <div className="detail-meta">
          <span>首次：{formatTime(issue.firstSeen)}</span>
          <span>末次：{formatTime(issue.lastSeen)}</span>
          <span>级别：{issue.level}</span>
        </div>
      </div>
      <Panel title="关联错误事件" extra={<span className="muted">{errors.length} 条</span>}>
        <Table columns={columns} rows={errors} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/errors/${r.id}`)} empty="暂无关联事件" />
      </Panel>
    </div>
  );
}

function truncate(value: string, max: number): string {
  return value && value.length > max ? value.slice(0, max) + '...' : value || '-';
}
