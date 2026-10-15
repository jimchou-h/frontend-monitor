export interface Project {
  id: number;
  name: string;
  apikey: string;
  trackKey: string;
  createdAt: string;
}

export interface StackFrame {
  url: string | null;
  func: string;
  line: number | null;
  column: number | null;
  mappedFrom?: string | null;
}

export interface BreadcrumbItem {
  type?: string;
  category?: string;
  data?: any;
  level?: string;
  time?: number;
}

export interface ErrorRecord {
  id: number;
  projectId: number;
  eventId: string;
  trackerId: string;
  errorType: string;
  message: string;
  name: string;
  level: string;
  url: string;
  page: string;
  fingerprint: string;
  stack: StackFrame[];
  breadcrumbs: BreadcrumbItem[];
  device: Record<string, any>;
  ip: string;
  ua: string;
  status: number;
  release: string;
  sourceMapApplied: boolean;
  createdAt: string;
}

export interface IssueRecord {
  id: number;
  projectId: number;
  fingerprint: string;
  title: string;
  errorType: string;
  message: string;
  level: string;
  status: number;
  firstSeen: string;
  lastSeen: string;
  count: number;
  sampleErrorId: number;
}

export interface TrackRecord {
  id: number;
  projectId: number;
  eventId: string;
  trackerId: string;
  trackId: string;
  actionType: string;
  page: string;
  custom: Record<string, any>;
  value: number | null;
  startTime: number | null;
  trackTime: number;
  device: Record<string, any>;
  createdAt: string;
}

export interface VitalRecord {
  id: number;
  projectId: number;
  eventId: string;
  trackerId: string;
  name: string;
  value: number;
  rating: string;
  page: string;
  device: Record<string, any>;
  createdAt: string;
}

export interface SourceMapRecord {
  id: number;
  projectId: number;
  release: string;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: string;
}

export interface PageQuery {
  page: number;
  size: number;
}

export interface ErrorQuery extends PageQuery {
  projectId?: number;
  type?: string;
  status?: number;
  q?: string;
  from?: string;
  to?: string;
}

export interface IssueQuery extends PageQuery {
  projectId?: number;
  status?: number;
  q?: string;
}

export interface TrackQuery extends PageQuery {
  projectId?: number;
  trackId?: string;
  from?: string;
  to?: string;
}

export interface TrendPoint {
  date: string;
  count: number;
  p75?: number;
  avg?: number;
}

export interface TrackSummaryRow {
  trackId: string;
  actionType: string;
  count: number;
  users: number;
  lastAt: string;
}

export interface VitalSummaryRow {
  name: string;
  count: number;
  avg: number;
  p75: number;
  goodRate: number;
  needsImprovementRate: number;
  poorRate: number;
}

export interface VitalPageRow {
  page: string;
  count: number;
  avg: number;
  p75: number;
  goodRate: number;
  poorRate: number;
}

export interface OverviewStats {
  errors: number;
  errorsDelta: number;
  issues: number;
  users: number;
  tracks: number;
  tracksDelta: number;
  vitals: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface IssueHitFields {
  projectId: number;
  fingerprint: string;
  title: string;
  errorType: string;
  message: string;
  level: string;
}

export interface Store {
  createProject(name: string, keys?: { apikey?: string; trackKey?: string }): Promise<Project>;
  listProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | null>;
  getProjectByApiKey(apikey: string): Promise<Project | null>;
  getProjectByTrackKey(trackKey: string): Promise<Project | null>;

  insertError(record: Omit<ErrorRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<ErrorRecord>;
  getError(id: number): Promise<ErrorRecord | null>;
  listErrors(query: ErrorQuery): Promise<Paged<ErrorRecord>>;
  updateErrorStatus(id: number, status: number): Promise<void>;
  hasEvent(projectId: number, eventId: string): Promise<boolean>;

  recordIssueHit(fields: IssueHitFields, trackerId: string, createdAt: Date, sampleErrorId: number): Promise<void>;
  listIssues(query: IssueQuery): Promise<Paged<IssueRecord>>;
  getIssue(id: number): Promise<IssueRecord | null>;
  getIssueByFingerprint(projectId: number, fingerprint: string): Promise<IssueRecord | null>;
  updateIssueStatus(id: number, status: number): Promise<void>;
  listErrorsByFingerprint(projectId: number, fingerprint: string, query: PageQuery): Promise<Paged<ErrorRecord>>;

  insertTrack(record: Omit<TrackRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<TrackRecord>;
  listTracks(query: TrackQuery): Promise<Paged<TrackRecord>>;
  trackSummary(days: number, projectId?: number): Promise<TrackSummaryRow[]>;
  trackTrend(trackId: string, days: number, projectId?: number): Promise<TrendPoint[]>;

  insertVital(record: Omit<VitalRecord, 'id' | 'createdAt'>, createdAt?: Date): Promise<VitalRecord>;
  vitalSummary(days: number, projectId?: number): Promise<VitalSummaryRow[]>;
  vitalTrend(name: string, days: number, projectId?: number): Promise<TrendPoint[]>;
  vitalPages(name: string, days: number, projectId?: number): Promise<VitalPageRow[]>;

  saveSourceMap(record: Omit<SourceMapRecord, 'id' | 'createdAt'>): Promise<SourceMapRecord>;
  listSourceMaps(projectId?: number): Promise<SourceMapRecord[]>;
  getSourceMap(id: number): Promise<SourceMapRecord | null>;
  findSourceMap(projectId: number, release: string, fileName: string): Promise<SourceMapRecord | null>;
  deleteSourceMap(id: number): Promise<void>;

  overview(days: number, projectId?: number): Promise<OverviewStats>;
  trend(metric: 'errors' | 'tracks' | 'vitals', days: number, projectId?: number): Promise<TrendPoint[]>;

  close(): Promise<void>;
}
