import { useState } from 'react';
import { Copy, KeyRound, Plus } from 'lucide-react';
import { api, getAdminToken, setAdminToken } from '../api';
import type { Project } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import Table, { Column } from '../components/Table';
import Badge from '../components/Badge';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function Settings() {
  const { projects, refreshProjects } = useProject();
  const [name, setName] = useState('');
  const [token, setToken] = useState(getAdminToken());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createProject(name.trim());
      setName('');
      setMessage('项目创建成功');
      await refreshProjects();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const saveToken = () => {
    setAdminToken(token.trim());
    setMessage('管理端 Token 已保存');
  };

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(() => setMessage('已复制到剪贴板'));
  };

  const columns: Column<Project>[] = [
    { key: 'id', title: 'ID', width: 60, render: (r) => r.id },
    { key: 'name', title: '项目名', width: 160, render: (r) => <strong>{r.name}</strong> },
    { key: 'apikey', title: '错误上报 apikey', render: (r) => <SecretCell value={r.apikey} onCopy={() => copy(r.apikey)} /> },
    { key: 'trackKey', title: '埋点上报 trackKey', render: (r) => <SecretCell value={r.trackKey} onCopy={() => copy(r.trackKey)} /> },
    { key: 'time', title: '创建时间', width: 170, render: (r) => formatTime(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="项目与密钥" description="管理接入项目，SDK init 时使用 apikey / trackKey" />
      {error && <ErrorBox message={error} />}
      {message && <div className="success-box">{message}</div>}

      <div className="two-col">
        <Panel title="创建项目">
          <div className="inline-form">
            <input placeholder="项目名称，如 商城 Web" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button className="btn" onClick={create} disabled={creating || !name.trim()}>
              <Plus size={15} /> 创建
            </button>
          </div>
        </Panel>
        <Panel title="管理端鉴权">
          <div className="inline-form">
            <input placeholder="服务端 ADMIN_TOKEN（未设置则留空）" value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="btn ghost" onClick={saveToken}>
              <KeyRound size={15} /> 保存
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="项目列表">
        <Table columns={columns} rows={projects} rowKey={(r) => r.id} empty="暂无项目" />
        <div className="muted note">提示：错误上报使用 apikey，埋点上报使用 trackKey；两者在服务端都会被校验。</div>
      </Panel>
    </div>
  );
}

function SecretCell({ value, onCopy }: { value: string; onCopy: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="secret-cell">
      <code>{show ? value : `${value.slice(0, 10)}••••••••`}</code>
      <button className="icon-btn" title="复制" onClick={onCopy}><Copy size={14} /></button>
      <button className="ghost-badge-btn" onClick={() => setShow(!show)}>{show ? '隐藏' : '显示'}</button>
    </div>
  );
}
