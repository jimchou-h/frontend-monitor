import type {
  ErrorRecord,
  IssueRecord,
  OverviewStats,
  Paged,
  Project,
  SourceMapRecord,
  TrackRecord,
  TrackSummaryRow,
  TrendPoint,
  VitalPageRow,
  VitalSummaryRow,
} from './types';

export class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export function getAdminToken(): string {
  return localStorage.getItem('fm_admin_token') || '';
}

export function setAdminToken(token: string): void {
  if (token) localStorage.setItem('fm_admin_token', token);
  else localStorage.removeItem('fm_admin_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...init, headers });
  let body: any = {};
  try {
    body = await res.json();
  } catch (_e) {
    body = {};
  }
  if (!res.ok || body.code !== 0) {
    throw new ApiError(body.message || `请求失败 (${res.status})`, res.status);
  }
  return body.data as T;
}

export const api = {
  projects: () => request<Project[]>('/projects'),
  createProject: (name: string) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  overview: (days: number, projectId?: number) =>
    request<OverviewStats>(`/stats/overview?days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  trend: (metric: string, days: number, projectId?: number) =>
    request<TrendPoint[]>(`/stats/trend?metric=${metric}&days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  errors: (params: Record<string, any>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
    return request<Paged<ErrorRecord>>(`/errors?${qs}`);
  },
  error: (id: number | string) => request<ErrorRecord>(`/errors/${id}`),
  updateError: (id: number | string, status: number) =>
    request(`/errors/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  issues: (params: Record<string, any>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
    return request<Paged<IssueRecord>>(`/issues?${qs}`);
  },
  issue: (id: number | string) => request<{ issue: IssueRecord; errors: Paged<ErrorRecord> }>(`/issues/${id}`),
  updateIssue: (id: number | string, status: number) =>
    request(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  trackSummary: (days: number, projectId?: number) =>
    request<TrackSummaryRow[]>(`/tracks/summary?days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  trackTrend: (trackId: string, days: number, projectId?: number) =>
    request<TrendPoint[]>(`/tracks/trend?trackId=${encodeURIComponent(trackId)}&days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  tracks: (params: Record<string, any>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
    return request<Paged<TrackRecord>>(`/tracks?${qs}`);
  },
  vitalSummary: (days: number, projectId?: number) =>
    request<VitalSummaryRow[]>(`/vitals/summary?days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  vitalTrend: (name: string, days: number, projectId?: number) =>
    request<TrendPoint[]>(`/vitals/trend?name=${name}&days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  vitalPages: (name: string, days: number, projectId?: number) =>
    request<VitalPageRow[]>(`/vitals/pages?name=${name}&days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
  sourceMaps: (projectId?: number) => request<SourceMapRecord[]>(`/sourcemaps${projectId ? `?projectId=${projectId}` : ''}`),
  deleteSourceMap: (id: number) => request(`/sourcemaps/${id}`, { method: 'DELETE' }),
};

export type { Project, OverviewStats, TrendPoint };
