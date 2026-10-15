import { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { api, getAdminToken } from '../api';
import type { SourceMapRecord } from '../types';
import { useProject } from '../App';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import Table, { Column } from '../components/Table';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import ErrorBox from '../components/ErrorBox';
import { formatTime } from './Overview';

export default function Sourcemaps() {
  const { projectId, projects } = useProject();
  const [rows, setRows] = useState<SourceMapRecord[]>([]);
  const [release, setRelease] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    api
      .sourceMaps(projectId)
      .then((list) => {
        setRows(list);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  const upload = async () => {
    if (!file || !projectId) return;
    setUploading(true);
    setError('');
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', String(projectId));
    form.append('release', release);
    try {
      const res = await fetch('/api/sourcemaps', {
        method: 'POST',
        body: form,
        headers: getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {},
      });
      const body = await res.json();
      if (!res.ok || body.code !== 0) throw new Error(body.message || '上传失败');
      setMessage('上传成功，清洗管线将自动使用该 map 还原错误栈');
      setFile(null);
      setRelease('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteSourceMap(id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const columns: Column<SourceMapRecord>[] = [
    { key: 'file', title: '文件', render: (r) => <code>{r.fileName}</code> },
    { key: 'project', title: '项目 ID', width: 90, render: (r) => r.projectId },
    { key: 'release', title: 'Release', width: 130, render: (r) => (r.release ? <Badge tone="blue">{r.release}</Badge> : <Badge tone="gray">latest</Badge>) },
    { key: 'size', title: '大小', width: 100, render: (r) => formatSize(r.size) },
    { key: 'time', title: '上传时间', width: 170, render: (r) => formatTime(r.createdAt) },
    {
      key: 'action',
      title: '',
      width: 60,
      render: (r) => (
        <button className="icon-btn danger" title="删除" onClick={() => remove(r.id)}>
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="SourceMap 管理" description="上传构建产物对应的 sourcemap，错误栈会在服务端自动还原" />
      {error && <ErrorBox message={error} />}
      {message && <div className="success-box">{message}</div>}
      <Panel title="上传 SourceMap">
        <div className="upload-form">
          <label>
            项目
            <select value={projectId ?? ''} onChange={() => undefined} disabled>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Release 版本（可选，留空表示默认匹配）
            <input value={release} onChange={(e) => setRelease(e.target.value)} placeholder="如 1.2.0" />
          </label>
          <label>
            .map 文件（≤ 20MB）
            <input type="file" accept=".map,application/json" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button className="btn" onClick={upload} disabled={uploading || !file}>
            <Upload size={15} /> {uploading ? '上传中...' : '上传'}
          </button>
        </div>
      </Panel>
      <Panel title="已上传文件">
        {loading ? <Loading /> : <Table columns={columns} rows={rows} rowKey={(r) => r.id} empty="暂无 sourcemap" />}
      </Panel>
    </div>
  );
}

function formatSize(size: number): string {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}
