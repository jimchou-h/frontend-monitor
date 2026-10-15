import { randomUUID } from 'crypto';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';
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
import { DDL } from './schema';
import { fillVitalTrend, summarizePages, summarizeVital } from './vitalStats';

function iso(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function jsonParse<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : (value as T);
  } catch (_e) {
    return fallback;
  }
}

function mapError(row: any): ErrorRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    eventId: row.event_id,
    trackerId: row.tracker_id,
    errorType: row.error_type,
    message: row.message || '',
    name: row.name,
    level: row.level,
    url: row.url || '',
    page: row.page,
    fingerprint: row.fingerprint,
    stack: jsonParse(row.stack_json, []),
    breadcrumbs: jsonParse(row.breadcrumbs_json, []),
    device: jsonParse(row.device_json, {}),
    ip: row.ip,
    ua: row.ua,
    status: Number(row.status),
    release: row.release,
    sourceMapApplied: !!Number(row.source_map_applied),
    createdAt: iso(row.created_at),
  };
}

function mapIssue(row: any): IssueRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    fingerprint: row.fingerprint,
    title: row.title,
    errorType: row.error_type,
    message: row.message || '',
    level: row.level,
    status: Number(row.status),
    firstSeen: iso(row.first_seen),
    lastSeen: iso(row.last_seen),
    count: Number(row.count),
    sampleErrorId: Number(row.sample_error_id),
  };
}

function mapTrack(row: any): TrackRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    eventId: row.event_id,
    trackerId: row.tracker_id,
    trackId: row.track_id,
    actionType: row.action_type,
    page: row.page,
    custom: jsonParse(row.custom_json, {}),
    value: row.value === null || row.value === undefined ? null : Number(row.value),
    startTime: row.start_time === null || row.start_time === undefined ? null : Number(row.start_time),
    trackTime: Number(row.track_time),
    device: jsonParse(row.device_json, {}),
    createdAt: iso(row.created_at),
  };
}

function mapVital(row: any): VitalRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    eventId: row.event_id,
    trackerId: row.tracker_id,
    name: row.name,
    value: Number(row.value),
    rating: row.rating,
    page: row.page,
    device: jsonParse(row.device_json, {}),
    createdAt: iso(row.created_at),
  };
}

function mapSourceMap(row: any): SourceMapRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    release: row.release,
    fileName: row.file_name,
    filePath: row.file_path,
    size: Number(row.size),
    createdAt: iso(row.created_at),
  };
}

function fillDays(days: number, rows: TrendPoint[]): TrendPoint[] {
  const map = new Map(rows.map((r) => [r.date, r.count]));
  const result: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) || 0 });
  }
  return result;
}

export class MysqlStore implements Store {
  private pool: Pool;

  constructor() {
    this.pool = createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectionLimit: 10,
      dateStrings: false,
    });
  }

  async init(): Promise<void> {
    for (const statement of DDL.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      await this.pool.query(statement);
    }
  }

  private async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  async createProject(name: string, keys?: { apikey?: string; trackKey?: string }): Promise<Project> {
    const apikey = keys?.apikey || `fm_${randomUUID().replace(/-/g, '')}`;
    const trackKey = keys?.trackKey || `track_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const [result] = await this.pool.query('INSERT INTO projects (name, apikey, track_key) VALUES (?, ?, ?)', [name, apikey, trackKey]);
    const id = (result as any).insertId;
    const rows = await this.query<any>('SELECT * FROM projects WHERE id = ?', [id]);
    return {
      id: Number(rows[0].id),
      name: rows[0].name,
      apikey: rows[0].apikey,
      trackKey: rows[0].track_key,
      createdAt: iso(rows[0].created_at),
    };
  }

  async listProjects(): Promise<Project[]> {
    const rows = await this.query<any>('SELECT * FROM projects ORDER BY id ASC');
    return rows.map((r) => ({ id: Number(r.id), name: r.name, apikey: r.apikey, trackKey: r.track_key, createdAt: iso(r.created_at) }));
  }

  async getProject(id: number): Promise<Project | null> {
    const rows = await this.query<any>('SELECT * FROM projects WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return { id: Number(r.id), name: r.name, apikey: r.apikey, trackKey: r.track_key, createdAt: iso(r.created_at) };
  }

  async getProjectByApiKey(apikey: string): Promise<Project | null> {
    const rows = await this.query<any>('SELECT * FROM projects WHERE apikey = ?', [apikey]);
    if (!rows.length) return null;
    const r = rows[0];
    return { id: Number(r.id), name: r.name, apikey: r.apikey, trackKey: r.track_key, createdAt: iso(r.created_at) };
  }

  async getProjectByTrackKey(trackKey: string): Promise<Project | null> {
    const rows = await this.query<any>('SELECT * FROM projects WHERE track_key = ?', [trackKey]);
    if (!rows.length) return null;
    const r = rows[0];
    return { id: Number(r.id), name: r.name, apikey: r.apikey, trackKey: r.track_key, createdAt: iso(r.created_at) };
  }

  async insertError(record: Omit<ErrorRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<ErrorRecord> {
    const withTime = createdAt
      ? `, created_at`
      : '';
    const valueTime = createdAt ? ', ?' : '';
    const [result] = await this.pool.query(
      `INSERT INTO errors (project_id, event_id, tracker_id, error_type, message, name, level, url, page, fingerprint, stack_json, breadcrumbs_json, device_json, ip, ua, status, release, source_map_applied${withTime})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${valueTime})`,
      [
        record.projectId,
        record.eventId,
        record.trackerId,
        record.errorType,
        record.message,
        record.name,
        record.level,
        record.url,
        record.page,
        record.fingerprint,
        JSON.stringify(record.stack || []),
        JSON.stringify(record.breadcrumbs || []),
        JSON.stringify(record.device || {}),
        record.ip,
        record.ua,
        record.status,
        record.release,
        record.sourceMapApplied ? 1 : 0,
        ...(createdAt ? [createdAt] : []),
      ],
    );
    const id = (result as any).insertId;
    const rows = await this.query<any>('SELECT * FROM errors WHERE id = ?', [id]);
    return mapError(rows[0]);
  }

  async getError(id: number): Promise<ErrorRecord | null> {
    const rows = await this.query<any>('SELECT * FROM errors WHERE id = ?', [id]);
    return rows.length ? mapError(rows[0]) : null;
  }

  async listErrors(query: ErrorQuery): Promise<Paged<ErrorRecord>> {
    const where: string[] = [];
    const params: any[] = [];
    if (query.projectId) {
      where.push('project_id = ?');
      params.push(query.projectId);
    }
    if (query.type) {
      where.push('error_type = ?');
      params.push(query.type);
    }
    if (query.status !== undefined) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.from) {
      where.push('created_at >= ?');
      params.push(new Date(query.from));
    }
    if (query.to) {
      where.push('created_at <= ?');
      params.push(new Date(query.to));
    }
    if (query.q) {
      where.push('(message LIKE ? OR name LIKE ? OR page LIKE ? OR fingerprint LIKE ?)');
      const like = `%${query.q}%`;
      params.push(like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await this.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM errors ${whereSql}`, params);
    const total = Number((totalRows[0] as any).total);
    params.push(query.size, (query.page - 1) * query.size);
    const rows = await this.query<any>(
      `SELECT * FROM errors ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    return { items: rows.map(mapError), total };
  }

  async updateErrorStatus(id: number, status: number): Promise<void> {
    await this.pool.query('UPDATE errors SET status = ? WHERE id = ?', [status, id]);
  }

  async hasEvent(projectId: number, eventId: string): Promise<boolean> {
    const rows = await this.query<RowDataPacket[]>('SELECT 1 AS found FROM errors WHERE project_id = ? AND event_id = ? LIMIT 1', [projectId, eventId]);
    return rows.length > 0;
  }

  async recordIssueHit(fields: IssueHitFields, _trackerId: string, createdAt: Date, sampleErrorId: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO issues (project_id, fingerprint, title, error_type, message, level, status, first_seen, last_seen, count, sample_error_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE count = count + 1, last_seen = VALUES(last_seen), title = VALUES(title), error_type = VALUES(error_type), message = VALUES(message), level = VALUES(level)`,
      [
        fields.projectId,
        fields.fingerprint,
        fields.title,
        fields.errorType,
        fields.message,
        fields.level,
        createdAt,
        createdAt,
        sampleErrorId,
      ],
    );
  }

  async listIssues(query: IssueQuery): Promise<Paged<IssueRecord>> {
    const where: string[] = [];
    const params: any[] = [];
    if (query.projectId) {
      where.push('project_id = ?');
      params.push(query.projectId);
    }
    if (query.status !== undefined) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.q) {
      where.push('(title LIKE ? OR message LIKE ?)');
      const like = `%${query.q}%`;
      params.push(like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await this.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM issues ${whereSql}`, params);
    const total = Number((totalRows[0] as any).total);
    params.push(query.size, (query.page - 1) * query.size);
    const rows = await this.query<any>(`SELECT * FROM issues ${whereSql} ORDER BY last_seen DESC LIMIT ? OFFSET ?`, params);
    return { items: rows.map(mapIssue), total };
  }

  async getIssue(id: number): Promise<IssueRecord | null> {
    const rows = await this.query<any>('SELECT * FROM issues WHERE id = ?', [id]);
    return rows.length ? mapIssue(rows[0]) : null;
  }

  async getIssueByFingerprint(projectId: number, fingerprint: string): Promise<IssueRecord | null> {
    const rows = await this.query<any>('SELECT * FROM issues WHERE project_id = ? AND fingerprint = ?', [projectId, fingerprint]);
    return rows.length ? mapIssue(rows[0]) : null;
  }

  async updateIssueStatus(id: number, status: number): Promise<void> {
    await this.pool.query('UPDATE issues SET status = ? WHERE id = ?', [status, id]);
  }

  async listErrorsByFingerprint(projectId: number, fingerprint: string, query: PageQuery): Promise<Paged<ErrorRecord>> {
    const totalRows = await this.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM errors WHERE project_id = ? AND fingerprint = ?',
      [projectId, fingerprint],
    );
    const total = Number((totalRows[0] as any).total);
    const rows = await this.query<any>(
      'SELECT * FROM errors WHERE project_id = ? AND fingerprint = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [projectId, fingerprint, query.size, (query.page - 1) * query.size],
    );
    return { items: rows.map(mapError), total };
  }

  async insertTrack(record: Omit<TrackRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<TrackRecord> {
    const withTime = createdAt ? ', created_at' : '';
    const valueTime = createdAt ? ', ?' : '';
    const [result] = await this.pool.query(
      `INSERT INTO tracks (project_id, event_id, tracker_id, track_id, action_type, page, custom_json, value, start_time, track_time, device_json${withTime})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${valueTime})`,
      [
        record.projectId,
        record.eventId,
        record.trackerId,
        record.trackId,
        record.actionType,
        record.page,
        JSON.stringify(record.custom || {}),
        record.value,
        record.startTime,
        record.trackTime,
        JSON.stringify(record.device || {}),
        ...(createdAt ? [createdAt] : []),
      ],
    );
    const id = (result as any).insertId;
    const rows = await this.query<any>('SELECT * FROM tracks WHERE id = ?', [id]);
    return mapTrack(rows[0]);
  }

  async listTracks(query: TrackQuery): Promise<Paged<TrackRecord>> {
    const where: string[] = [];
    const params: any[] = [];
    if (query.projectId) {
      where.push('project_id = ?');
      params.push(query.projectId);
    }
    if (query.trackId) {
      where.push('track_id = ?');
      params.push(query.trackId);
    }
    if (query.from) {
      where.push('created_at >= ?');
      params.push(new Date(query.from));
    }
    if (query.to) {
      where.push('created_at <= ?');
      params.push(new Date(query.to));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await this.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM tracks ${whereSql}`, params);
    const total = Number((totalRows[0] as any).total);
    params.push(query.size, (query.page - 1) * query.size);
    const rows = await this.query<any>(`SELECT * FROM tracks ${whereSql} ORDER BY track_time DESC LIMIT ? OFFSET ?`, params);
    return { items: rows.map(mapTrack), total };
  }

  async trackSummary(days: number, projectId?: number): Promise<TrackSummaryRow[]> {
    const since = Date.now() - days * 86_400_000;
    const where = ['track_time >= ?'];
    const params: any[] = [since];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT track_id, MAX(action_type) AS action_type, COUNT(*) AS count, COUNT(DISTINCT tracker_id) AS users, MAX(track_time) AS last_at
       FROM tracks WHERE ${where.join(' AND ')} GROUP BY track_id ORDER BY count DESC`,
      params,
    );
    return rows.map((r) => ({ trackId: r.track_id, actionType: r.action_type, count: Number(r.count), users: Number(r.users), lastAt: iso(new Date(Number(r.last_at))) }));
  }

  async trackTrend(trackId: string, days: number, projectId?: number): Promise<TrendPoint[]> {
    const since = Date.now() - days * 86_400_000;
    const where = ['track_id = ?', 'track_time >= ?'];
    const params: any[] = [trackId, since];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT DATE(FROM_UNIXTIME(track_time / 1000)) AS date, COUNT(*) AS count FROM tracks WHERE ${where.join(' AND ')} GROUP BY date`,
      params,
    );
    return fillDays(days, rows.map((r) => ({ date: String(r.date), count: Number(r.count) })));
  }

  async insertVital(record: Omit<VitalRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<VitalRecord> {
    const withTime = createdAt ? ', created_at' : '';
    const valueTime = createdAt ? ', ?' : '';
    const [result] = await this.pool.query(
      `INSERT INTO vitals (project_id, event_id, tracker_id, name, value, rating, page, device_json${withTime}) VALUES (?, ?, ?, ?, ?, ?, ?, ?${valueTime})`,
      [record.projectId, record.eventId, record.trackerId, record.name, record.value, record.rating, record.page, JSON.stringify(record.device || {}), ...(createdAt ? [createdAt] : [])],
    );
    const id = (result as any).insertId;
    const rows = await this.query<any>('SELECT * FROM vitals WHERE id = ?', [id]);
    return mapVital(rows[0]);
  }

  async vitalSummary(days: number, projectId?: number): Promise<VitalSummaryRow[]> {
    const where = ['created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const params: any[] = [days];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT name, value FROM vitals WHERE ${where.join(' AND ')} ORDER BY name ASC, value ASC`,
      params,
    );
    const groups = new Map<string, number[]>();
    rows.forEach((r) => {
      const list = groups.get(r.name) || [];
      list.push(Number(r.value));
      groups.set(r.name, list);
    });
    const result: VitalSummaryRow[] = [];
    groups.forEach((values, name) => result.push(summarizeVital(name, values)));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async vitalTrend(name: string, days: number, projectId?: number): Promise<TrendPoint[]> {
    const where = ['name = ?', 'created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const params: any[] = [name, days];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, value FROM vitals WHERE ${where.join(' AND ')}`,
      params,
    );
    const groups = new Map<string, number[]>();
    rows.forEach((r) => {
      const key = String(r.date).slice(0, 10);
      const list = groups.get(key) || [];
      list.push(Number(r.value));
      groups.set(key, list);
    });
    return fillVitalTrend(days, groups, name);
  }

  async vitalPages(name: string, days: number, projectId?: number): Promise<VitalPageRow[]> {
    const where = ['name = ?', 'created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const params: any[] = [name, days];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT page, value FROM vitals WHERE ${where.join(' AND ')}`,
      params,
    );
    const groups = new Map<string, number[]>();
    rows.forEach((r) => {
      const list = groups.get(r.page) || [];
      list.push(Number(r.value));
      groups.set(r.page, list);
    });
    return summarizePages(name, groups);
  }

  async saveSourceMap(record: Omit<SourceMapRecord, 'id' | 'createdAt'>): Promise<SourceMapRecord> {
    const [result] = await this.pool.query(
      'INSERT INTO sourcemaps (project_id, release, file_name, file_path, size) VALUES (?, ?, ?, ?, ?)',
      [record.projectId, record.release, record.fileName, record.filePath, record.size],
    );
    const id = (result as any).insertId;
    const rows = await this.query<any>('SELECT * FROM sourcemaps WHERE id = ?', [id]);
    return mapSourceMap(rows[0]);
  }

  async listSourceMaps(projectId?: number): Promise<SourceMapRecord[]> {
    const rows = projectId
      ? await this.query<any>('SELECT * FROM sourcemaps WHERE project_id = ? ORDER BY created_at DESC', [projectId])
      : await this.query<any>('SELECT * FROM sourcemaps ORDER BY created_at DESC');
    return rows.map(mapSourceMap);
  }

  async getSourceMap(id: number): Promise<SourceMapRecord | null> {
    const rows = await this.query<any>('SELECT * FROM sourcemaps WHERE id = ?', [id]);
    return rows.length ? mapSourceMap(rows[0]) : null;
  }

  async findSourceMap(projectId: number, release: string, fileName: string): Promise<SourceMapRecord | null> {
    const name = fileName.split('/').pop() + '.map';
    if (release) {
      const rows = await this.query<any>(
        'SELECT * FROM sourcemaps WHERE project_id = ? AND release = ? AND file_name = ? ORDER BY created_at DESC LIMIT 1',
        [projectId, release, name],
      );
      if (rows.length) return mapSourceMap(rows[0]);
    }
    const rows = await this.query<any>(
      'SELECT * FROM sourcemaps WHERE project_id = ? AND file_name = ? ORDER BY created_at DESC LIMIT 1',
      [projectId, name],
    );
    return rows.length ? mapSourceMap(rows[0]) : null;
  }

  async deleteSourceMap(id: number): Promise<void> {
    await this.pool.query('DELETE FROM sourcemaps WHERE id = ?', [id]);
  }

  async overview(days: number, projectId?: number): Promise<OverviewStats> {
    const errorWhere = ['created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const errorParams: any[] = [days];
    const trackWhere = ['track_time >= ?'];
    const trackParams: any[] = [Date.now() - days * 86_400_000];
    if (projectId) {
      errorWhere.push('project_id = ?');
      errorParams.push(projectId);
      trackWhere.push('project_id = ?');
      trackParams.push(projectId);
    }
    const [errorRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
              SUM(created_at >= CURRENT_DATE) AS today,
              SUM(created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) AND created_at < CURRENT_DATE) AS yesterday
       FROM errors WHERE ${errorWhere.join(' AND ')}`,
      errorParams,
    );
    const [trackRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
              SUM(track_time >= ?) AS today,
              SUM(track_time >= ? AND track_time < ?) AS yesterday
       FROM tracks WHERE ${trackWhere.join(' AND ')}`,
      [...trackParams, dayStart(), dayStart() - 86_400_000, dayStart()],
    );
    const issueWhere = ['status = 0'];
    const issueParams: any[] = [];
    if (projectId) {
      issueWhere.push('project_id = ?');
      issueParams.push(projectId);
    }
    const [issueRows] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM issues WHERE ${issueWhere.join(' AND ')}`, issueParams);
    const userWhere = ['created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const userParams: any[] = [days];
    if (projectId) {
      userWhere.push('project_id = ?');
      userParams.push(projectId);
    }
    const [userRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT tracker_id) AS total FROM errors WHERE ${userWhere.join(' AND ')}`,
      userParams,
    );
    const vitalWhere = ['created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const vitalParams: any[] = [days];
    if (projectId) {
      vitalWhere.push('project_id = ?');
      vitalParams.push(projectId);
    }
    const [vitalRows] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM vitals WHERE ${vitalWhere.join(' AND ')}`, vitalParams);
    return {
      errors: Number(errorRows[0].total || 0),
      errorsDelta: Number(errorRows[0].today || 0) - Number(errorRows[0].yesterday || 0),
      issues: Number(issueRows[0].total || 0),
      users: Number(userRows[0].total || 0),
      tracks: Number(trackRows[0].total || 0),
      tracksDelta: Number(trackRows[0].today || 0) - Number(trackRows[0].yesterday || 0),
      vitals: Number(vitalRows[0].total || 0),
    };
  }

  async trend(metric: 'errors' | 'tracks' | 'vitals', days: number, projectId?: number): Promise<TrendPoint[]> {
    const table = metric === 'errors' ? 'errors' : metric === 'tracks' ? 'tracks' : 'vitals';
    const where = ['created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)'];
    const params: any[] = [days - 1];
    if (projectId) {
      where.push('project_id = ?');
      params.push(projectId);
    }
    const rows = await this.query<any>(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count FROM ${table} WHERE ${where.join(' AND ')} GROUP BY date`,
      params,
    );
    return fillDays(days, rows.map((r) => ({ date: String(r.date), count: Number(r.count) })));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function dayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
