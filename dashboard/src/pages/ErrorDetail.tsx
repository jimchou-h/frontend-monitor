import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, EyeOff, Undo2 } from 'lucide-react';
import { api } from '../api';
import type { BreadcrumbItem, ErrorRecord, StackFrame } from '../types';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import Badge, { statusBadge } from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function ErrorDetail() {
  const { id } = useParams();
  const [record, setRecord] = useState<ErrorRecord | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .error(id!)
      .then(setRecord)
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const updateStatus = async (status: number) => {
    setSaving(true);
    try {
      await api.updateError(id!, status);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !record) return <ErrorBox message={error} onRetry={load} />;
  if (!record) return <Loading />;

  return (
    <div>
      <PageHeader
        title="错误详情"
        description={`#${record.id} · ${record.eventId}`}
        actions={
          <div className="btn-row">
            <Link className="btn ghost" to="/errors">
              <ArrowLeft size={15} /> 返回列表
            </Link>
            {record.status !== 1 && (
              <button className="btn" disabled={saving} onClick={() => updateStatus(1)}>
                <CheckCircle2 size={15} /> 标记解决
              </button>
            )}
            {record.status !== 2 && (
              <button className="btn ghost" disabled={saving} onClick={() => updateStatus(2)}>
                <EyeOff size={15} /> 忽略
              </button>
            )}
            {record.status !== 0 && (
              <button className="btn ghost" disabled={saving} onClick={() => updateStatus(0)}>
                <Undo2 size={15} /> 恢复
              </button>
            )}
          </div>
        }
      />

      <div className="detail-head">
        <div>
          <div className="detail-title-row">
            <Badge tone="blue">{record.errorType}</Badge>
            {statusBadge(record.status)}
            {record.sourceMapApplied && <Badge tone="green">SourceMap 已还原</Badge>}
            {record.release && <Badge tone="gray">release: {record.release}</Badge>}
          </div>
          <h2>{record.name}</h2>
          <p className="detail-message">{record.message}</p>
        </div>
        <div className="detail-meta">
          <span>时间：{formatTime(record.createdAt)}</span>
          <span>用户：{record.trackerId}</span>
          <span>IP：{record.ip || '-'}</span>
          <span>指纹：<code>{record.fingerprint}</code></span>
        </div>
      </div>

      <div className="two-col">
        <Panel title="调用栈" className="stack-panel">
          {record.stack.length === 0 && <div className="muted">无调用栈</div>}
          {record.stack.map((frame: StackFrame, i: number) => (
            <div className="stack-frame" key={i}>
              <div className="frame-func">{frame.func || 'anonymous'}</div>
              <div className="frame-url mono">
                {frame.mappedFrom && <Badge tone="green">sourcemap</Badge>} {frame.url}:{frame.line ?? '-'}:{frame.column ?? '-'}
              </div>
              {frame.mappedFrom && <div className="frame-origin mono">minified: {frame.mappedFrom}</div>}
            </div>
          ))}
        </Panel>

        <Panel title="用户行为栈">
          {record.breadcrumbs.length === 0 && <div className="muted">无行为记录</div>}
          <div className="timeline">
            {record.breadcrumbs.map((b: BreadcrumbItem, i: number) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-dot" />
                <div className="timeline-body">
                  <div className="timeline-head">
                    <Badge tone="gray">{b.type}</Badge>
                    <span className="mono">{b.time ? formatTime(b.time) : ''}</span>
                  </div>
                  <pre className="timeline-data">{JSON.stringify(b.data, null, 2).slice(0, 500)}</pre>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="环境信息">
        <div className="kv-grid">
          {Object.entries({ ...record.device, ua: record.ua }).map(([key, value]) => (
            <div className="kv-item" key={key}>
              <span>{key}</span>
              <strong>{typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
