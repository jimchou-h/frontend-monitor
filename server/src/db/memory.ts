import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFile } from 'fs';
import { dirname } from 'path';
import { config } from '../config';
import {
  ErrorQuery,
  ErrorRecord,
  IssueQuery,
  IssueRecord,
  IssueHitFields,
  OverviewStats,
  PageQuery,
  Paged,
  Project,
  SourceMapRecord,
  Store,
  TrackQuery,
  TrackRecord,
  TrackSummaryRow,
  TrendPoint,
  VitalPageRow,
  VitalRecord,
  VitalSummaryRow,
} from './types';
import { fillVitalTrend, summarizePages, summarizeVital } from './vitalStats';

function now(): string {
  return new Date().toISOString();
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class MemoryStore implements Store {
  private projects: Project[] = [];
  private errors: ErrorRecord[] = [];
  private issues: IssueRecord[] = [];
  private tracks: TrackRecord[] = [];
  private vitals: VitalRecord[] = [];
  private sourceMaps: SourceMapRecord[] = [];

  constructor(private filePath?: string) {
    const file = filePath;
    if (!file) return;
    try {
      const raw = readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      this.projects = data.projects || [];
      this.errors = data.errors || [];
      this.issues = data.issues || [];
      this.tracks = data.tracks || [];
      this.vitals = data.vitals || [];
      this.sourceMaps = data.sourceMaps || [];
    } catch (_e) {
      // 首次启动没有持久化文件
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    const payload = JSON.stringify({
      projects: this.projects,
      errors: this.errors,
      issues: this.issues,
      tracks: this.tracks,
      vitals: this.vitals,
      sourceMaps: this.sourceMaps,
    });
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFile(this.filePath, payload, () => undefined);
  }

  async createProject(name: string, keys?: { apikey?: string; trackKey?: string }): Promise<Project> {
    const project: Project = {
      id: this.projects.length + 1,
      name,
      apikey: keys?.apikey || `fm_${randomUUID().replace(/-/g, '')}`,
      trackKey: keys?.trackKey || `track_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      createdAt: now(),
    };
    this.projects.push(project);
    this.persist();
    return project;
  }

  async listProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => a.id - b.id);
  }

  async getProject(id: number): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) || null;
  }

  async getProjectByApiKey(apikey: string): Promise<Project | null> {
    return this.projects.find((p) => p.apikey === apikey) || null;
  }

  async getProjectByTrackKey(trackKey: string): Promise<Project | null> {
    return this.projects.find((p) => p.trackKey === trackKey) || null;
  }

  async insertError(record: Omit<ErrorRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<ErrorRecord> {
    const item: ErrorRecord = { ...record, id: this.errors.length + 1, createdAt: (createdAt || new Date()).toISOString() };
    this.errors.push(item);
    this.persist();
    return item;
  }

  async getError(id: number): Promise<ErrorRecord | null> {
    return this.errors.find((e) => e.id === id) || null;
  }

  async listErrors(query: ErrorQuery): Promise<Paged<ErrorRecord>> {
    let items = [...this.errors].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (query.projectId) items = items.filter((e) => e.projectId === query.projectId);
    if (query.type) items = items.filter((e) => e.errorType === query.type);
    if (query.status !== undefined) items = items.filter((e) => e.status === query.status);
    if (query.from) items = items.filter((e) => e.createdAt >= new Date(query.from!).toISOString());
    if (query.to) items = items.filter((e) => e.createdAt <= new Date(query.to!).toISOString());
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.page.toLowerCase().includes(q) ||
          e.fingerprint.includes(q),
      );
    }
    return { items: items.slice((query.page - 1) * query.size, query.page * query.size), total: items.length };
  }

  async updateErrorStatus(id: number, status: number): Promise<void> {
    const error = this.errors.find((e) => e.id === id);
    if (error) {
      error.status = status;
      this.persist();
    }
  }

  async hasEvent(projectId: number, eventId: string): Promise<boolean> {
    return this.errors.some((e) => e.projectId === projectId && e.eventId === eventId);
  }

  async recordIssueHit(fields: IssueHitFields, _trackerId: string, createdAt: Date, sampleErrorId: number): Promise<void> {
    let issue = this.issues.find((i) => i.projectId === fields.projectId && i.fingerprint === fields.fingerprint);
    if (!issue) {
      issue = {
        id: this.issues.length + 1,
        projectId: fields.projectId,
        fingerprint: fields.fingerprint,
        title: fields.title,
        errorType: fields.errorType,
        message: fields.message,
        level: fields.level,
        status: 0,
        firstSeen: createdAt.toISOString(),
        lastSeen: createdAt.toISOString(),
        count: 1,
        sampleErrorId,
      };
      this.issues.push(issue);
    } else {
      issue.count += 1;
      issue.lastSeen = createdAt.toISOString();
      issue.title = fields.title;
      issue.level = fields.level;
      issue.errorType = fields.errorType;
    }
    this.persist();
  }

  async listIssues(query: IssueQuery): Promise<Paged<IssueRecord>> {
    let items = [...this.issues].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    if (query.projectId) items = items.filter((i) => i.projectId === query.projectId);
    if (query.status !== undefined) items = items.filter((i) => i.status === query.status);
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q) || i.message.toLowerCase().includes(q));
    }
    return { items: items.slice((query.page - 1) * query.size, query.page * query.size), total: items.length };
  }

  async getIssue(id: number): Promise<IssueRecord | null> {
    return this.issues.find((i) => i.id === id) || null;
  }

  async getIssueByFingerprint(projectId: number, fingerprint: string): Promise<IssueRecord | null> {
    return this.issues.find((i) => i.projectId === projectId && i.fingerprint === fingerprint) || null;
  }

  async updateIssueStatus(id: number, status: number): Promise<void> {
    const issue = this.issues.find((i) => i.id === id);
    if (issue) {
      issue.status = status;
      this.persist();
    }
  }

  async listErrorsByFingerprint(projectId: number, fingerprint: string, query: PageQuery): Promise<Paged<ErrorRecord>> {
    const items = this.errors
      .filter((e) => e.projectId === projectId && e.fingerprint === fingerprint)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items: items.slice((query.page - 1) * query.size, query.page * query.size), total: items.length };
  }

  async insertTrack(record: Omit<TrackRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<TrackRecord> {
    const item: TrackRecord = { ...record, id: this.tracks.length + 1, createdAt: (createdAt || new Date()).toISOString() };
    this.tracks.push(item);
    this.persist();
    return item;
  }

  async listTracks(query: TrackQuery): Promise<Paged<TrackRecord>> {
    let items = [...this.tracks].sort((a, b) => b.trackTime - a.trackTime);
    if (query.projectId) items = items.filter((t) => t.projectId === query.projectId);
    if (query.trackId) items = items.filter((t) => t.trackId === query.trackId);
    if (query.from) items = items.filter((t) => t.createdAt >= new Date(query.from!).toISOString());
    if (query.to) items = items.filter((t) => t.createdAt <= new Date(query.to!).toISOString());
    return { items: items.slice((query.page - 1) * query.size, query.page * query.size), total: items.length };
  }

  async trackSummary(days: number, projectId?: number): Promise<TrackSummaryRow[]> {
    const since = Date.now() - days * 86_400_000;
    const rows = new Map<string, { actionType: string; count: number; users: Set<string>; lastAt: number }>();
    this.tracks.forEach((t) => {
      if (projectId && t.projectId !== projectId) return;
      if (t.trackTime < since) return;
      const row = rows.get(t.trackId) || { actionType: t.actionType, count: 0, users: new Set(), lastAt: 0 };
      row.count += 1;
      row.users.add(t.trackerId);
      row.lastAt = Math.max(row.lastAt, t.trackTime);
      rows.set(t.trackId, row);
    });
    return [...rows.entries()]
      .map(([trackId, row]) => ({
        trackId,
        actionType: row.actionType,
        count: row.count,
        users: row.users.size,
        lastAt: new Date(row.lastAt).toISOString(),
      }))
      .sort((a, b) => b.count - a.count);
  }

  async trackTrend(trackId: string, days: number, projectId?: number): Promise<TrendPoint[]> {
    const since = Date.now() - days * 86_400_000;
    const points = new Map<string, number>();
    this.tracks.forEach((t) => {
      if (t.trackId !== trackId) return;
      if (projectId && t.projectId !== projectId) return;
      if (t.trackTime < since) return;
      const key = dateKey(new Date(t.trackTime));
      points.set(key, (points.get(key) || 0) + 1);
    });
    return fillDays(days, points);
  }

  async insertVital(record: Omit<VitalRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<VitalRecord> {
    const item: VitalRecord = { ...record, id: this.vitals.length + 1, createdAt: (createdAt || new Date()).toISOString() };
    this.vitals.push(item);
    this.persist();
    return item;
  }

  async vitalSummary(days: number, projectId?: number): Promise<VitalSummaryRow[]> {
    const since = Date.now() - days * 86_400_000;
    const groups = new Map<string, number[]>();
    this.vitals.forEach((v) => {
      if (projectId && v.projectId !== projectId) return;
      if (Date.parse(v.createdAt) < since) return;
      const list = groups.get(v.name) || [];
      list.push(v.value);
      groups.set(v.name, list);
    });
    const result: VitalSummaryRow[] = [];
    groups.forEach((values, name) => result.push(summarizeVital(name, values)));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async vitalTrend(name: string, days: number, projectId?: number): Promise<TrendPoint[]> {
    const since = Date.now() - days * 86_400_000;
    const groups = new Map<string, number[]>();
    this.vitals.forEach((v) => {
      if (v.name !== name) return;
      if (projectId && v.projectId !== projectId) return;
      if (Date.parse(v.createdAt) < since) return;
      const key = dateKey(new Date(v.createdAt));
      const list = groups.get(key) || [];
      list.push(v.value);
      groups.set(key, list);
    });
    return fillVitalTrend(days, groups, name);
  }

  async vitalPages(name: string, days: number, projectId?: number): Promise<VitalPageRow[]> {
    const since = Date.now() - days * 86_400_000;
    const groups = new Map<string, number[]>();
    this.vitals.forEach((v) => {
      if (v.name !== name) return;
      if (projectId && v.projectId !== projectId) return;
      if (Date.parse(v.createdAt) < since) return;
      const list = groups.get(v.page) || [];
      list.push(v.value);
      groups.set(v.page, list);
    });
    return summarizePages(name, groups);
  }

  async saveSourceMap(record: Omit<SourceMapRecord, 'id' | 'createdAt'>): Promise<SourceMapRecord> {
    const item: SourceMapRecord = { ...record, id: this.sourceMaps.length + 1, createdAt: now() };
    this.sourceMaps.push(item);
    this.persist();
    return item;
  }

  async listSourceMaps(projectId?: number): Promise<SourceMapRecord[]> {
    return this.sourceMaps.filter((s) => !projectId || s.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getSourceMap(id: number): Promise<SourceMapRecord | null> {
    return this.sourceMaps.find((s) => s.id === id) || null;
  }

  async findSourceMap(projectId: number, release: string, fileName: string): Promise<SourceMapRecord | null> {
    const name = fileName.split('/').pop() + '.map';
    const candidates = this.sourceMaps.filter((s) => s.projectId === projectId && s.fileName === name);
    if (!candidates.length) return null;
    if (release) {
      const exact = candidates.find((s) => s.release === release);
      if (exact) return exact;
    }
    return candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  async deleteSourceMap(id: number): Promise<void> {
    this.sourceMaps = this.sourceMaps.filter((s) => s.id !== id);
    this.persist();
  }

  async overview(days: number, projectId?: number): Promise<OverviewStats> {
    const since = Date.now() - days * 86_400_000;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const filter = (item: { projectId: number; createdAt: string }) => {
      if (projectId && item.projectId !== projectId) return false;
      return Date.parse(item.createdAt) >= since;
    };
    const errors = this.errors.filter(filter);
    const errorsToday = errors.filter((e) => Date.parse(e.createdAt) >= dayStart.getTime()).length;
    const yesterdayStart = dayStart.getTime() - 86_400_000;
    const errorsYesterday = errors.filter((e) => Date.parse(e.createdAt) >= yesterdayStart && Date.parse(e.createdAt) < dayStart.getTime()).length;
    const tracks = this.tracks.filter((t) => {
      if (projectId && t.projectId !== projectId) return false;
      return t.trackTime >= since;
    });
    const tracksToday = tracks.filter((t) => t.trackTime >= dayStart.getTime()).length;
    const tracksYesterday = tracks.filter((t) => t.trackTime >= yesterdayStart && t.trackTime < dayStart.getTime()).length;
    const users = new Set(errors.map((e) => e.trackerId)).size;
    return {
      errors: errors.length,
      errorsDelta: errorsToday - errorsYesterday,
      issues: this.issues.filter((i) => i.status === 0 && (!projectId || i.projectId === projectId)).length,
      users,
      tracks: tracks.length,
      tracksDelta: tracksToday - tracksYesterday,
      vitals: this.vitals.filter((v) => {
        if (projectId && v.projectId !== projectId) return false;
        return Date.parse(v.createdAt) >= since;
      }).length,
    };
  }

  async trend(metric: 'errors' | 'tracks' | 'vitals', days: number, projectId?: number): Promise<TrendPoint[]> {
    const since = Date.now() - days * 86_400_000;
    const points = new Map<string, number>();
    const add = (key: string) => points.set(key, (points.get(key) || 0) + 1);
    if (metric === 'errors') {
      this.errors.forEach((e) => {
        if (projectId && e.projectId !== projectId) return;
        if (Date.parse(e.createdAt) >= since) add(dateKey(new Date(e.createdAt)));
      });
    } else if (metric === 'tracks') {
      this.tracks.forEach((t) => {
        if (projectId && t.projectId !== projectId) return;
        if (t.trackTime >= since) add(dateKey(new Date(t.trackTime)));
      });
    } else {
      this.vitals.forEach((v) => {
        if (projectId && v.projectId !== projectId) return;
        if (Date.parse(v.createdAt) >= since) add(dateKey(new Date(v.createdAt)));
      });
    }
    return fillDays(days, points);
  }

  async close(): Promise<void> {
    return undefined;
  }
}

function fillDays(days: number, points: Map<string, number>): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = dateKey(d);
    result.push({ date: key, count: points.get(key) || 0 });
  }
  return result;
}
