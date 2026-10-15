import { randomUUID } from 'crypto';
import { Store } from '../db/types';
import { fingerprintError } from './fingerprint';
import { normalizeDevice, normalizeErrorData } from './normalize';
import { sanitizeBreadcrumbs, sanitizeData, sanitizeStack, sanitizeUrl } from './sanitize';
import { SourcemapResolver } from './sourcemap';

export interface IngestContext {
  ip: string;
  ua: string;
}

export interface IngestResult {
  ok: boolean;
  code: number;
  message: string;
}

export class IngestService {
  constructor(
    private store: Store,
    private resolver: SourcemapResolver,
  ) {}

  async processError(body: any, ctx: IngestContext): Promise<IngestResult> {
    const auth = body?.authInfo || {};
    if (!auth.apikey) return { ok: false, code: 401, message: '缺少 apikey' };
    const project = await this.store.getProjectByApiKey(auth.apikey);
    if (!project) return { ok: false, code: 401, message: 'apikey 无效' };
    const data = body?.data;
    if (!data || typeof data !== 'object') return { ok: false, code: 400, message: 'data 缺失' };

    const eventId = String(data.eventId || `${auth.trackerId || 'anon'}_${data.time || Date.now()}`);
    if (await this.store.hasEvent(project.id, eventId)) {
      return { ok: true, code: 200, message: '重复事件已忽略' };
    }

    const breadcrumbs = sanitizeBreadcrumbs(body.breadcrumb);
    const device = normalizeDevice(body.deviceInfo, ctx);
    const rawStack = sanitizeStack(data.stack);
    const resolved = rawStack.length ? await this.resolver.resolve(project.id, data.release, rawStack) : { stack: rawStack, applied: false };
    const cleaned = sanitizeData({ ...data, stack: resolved.stack });
    const record = normalizeErrorData(cleaned, auth, breadcrumbs, device, resolved.stack, ctx, eventId);
    record.projectId = project.id;
    record.fingerprint = fingerprintError(cleaned, resolved.stack);
    record.sourceMapApplied = resolved.applied;

    const saved = await this.store.insertError(record);
    const title = `${record.name}: ${record.message}`.slice(0, 512);
    await this.store.recordIssueHit(
      {
        projectId: project.id,
        fingerprint: record.fingerprint,
        title,
        errorType: record.errorType,
        message: record.message,
        level: record.level,
      },
      record.trackerId,
      new Date(saved.createdAt),
      saved.id,
    );
    return { ok: true, code: 202, message: 'ok' };
  }

  async processTrack(body: any, ctx: IngestContext): Promise<IngestResult> {
    const auth = body?.authInfo || {};
    const project = auth.apikey
      ? await this.store.getProjectByApiKey(auth.apikey)
      : auth.trackKey
        ? await this.store.getProjectByTrackKey(auth.trackKey)
        : null;
    if (!project) return { ok: false, code: 401, message: '密钥无效' };
    const data = body?.data;
    if (!data || typeof data !== 'object') return { ok: false, code: 400, message: 'data 缺失' };

    const device = normalizeDevice(body.deviceInfo, ctx);
    const trackerId = String(auth.trackerId || 'anonymous').slice(0, 128);
    const eventId = String(data.id || `${trackerId}_${data.trackTime || Date.now()}_${randomUUID().slice(0, 8)}`);

    if (data.isVital && data.vital) {
      await this.store.insertVital({
        projectId: project.id,
        eventId,
        trackerId,
        name: String(data.vital.name || '').slice(0, 64),
        value: Number(data.vital.value) || 0,
        rating: String(data.vital.rating || '').slice(0, 32),
        page: String(data.page || data.vital.page || '').slice(0, 512),
        device,
      });
      return { ok: true, code: 202, message: 'ok' };
    }

    const customSource = data.custom && typeof data.custom === 'object' ? data.custom : {};
    await this.store.insertTrack({
      projectId: project.id,
      eventId,
      trackerId,
      trackId: String(data.trackId || 'unknown').slice(0, 128),
      actionType: String(data.actionType || 'EVENT').slice(0, 32),
      page: String(data.page || '').slice(0, 512),
      custom: sanitizeData(customSource),
      value: Number.isFinite(Number(data.value)) ? Number(data.value) : null,
      startTime: Number.isFinite(Number(data.startTime)) ? Number(data.startTime) : null,
      trackTime: Number(data.trackTime) || Date.now(),
      device,
    });
    return { ok: true, code: 202, message: 'ok' };
  }
}

export function sanitizeIngestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const result: any = { ...body };
  if (result.authInfo) result.authInfo = { ...result.authInfo };
  if (typeof result.data?.url === 'string') result.data.url = sanitizeUrl(result.data.url);
  return result;
}
