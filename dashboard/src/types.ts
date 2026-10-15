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

export interface TrendPoint {
  date: string;
  count: number;
  p75?: number;
  avg?: number;
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

export interface Paged<T> {
  items: T[];
  total: number;
}
