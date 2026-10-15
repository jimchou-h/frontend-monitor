import { parseUA } from './ua';
import type { BreadcrumbItem, ErrorRecord, StackFrame } from '../db/types';

export interface NormalizeContext {
  ip: string;
  ua: string;
}

export function normalizeDevice(device: any, ctx: NormalizeContext): Record<string, any> {
  const parsed = parseUA(ctx.ua);
  return {
    ...(device && typeof device === 'object' ? device : {}),
    ua: ctx.ua,
    ip: ctx.ip,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    device: parsed.device,
    deviceType: parsed.deviceType,
  };
}

export function normalizeErrorData(
  data: any,
  auth: any,
  breadcrumbs: BreadcrumbItem[],
  device: Record<string, any>,
  stack: StackFrame[],
  ctx: NormalizeContext,
  eventId: string,
): Omit<ErrorRecord, 'id' | 'createdAt'> {
  const url = typeof data.url === 'string' ? data.url : '';
  return {
    projectId: 0,
    eventId,
    trackerId: String(auth.trackerId || 'anonymous'),
    errorType: String(data.type || 'UNKNOWN').slice(0, 64),
    message: typeof data.message === 'string' ? data.message.slice(0, 2048) : String(data.message || ''),
    name: String(data.name || 'UNKNOWN').slice(0, 255),
    level: String(data.level || 'error').slice(0, 16),
    url,
    page: String(data.page || url).slice(0, 512),
    fingerprint: '',
    stack,
    breadcrumbs,
    device,
    ip: ctx.ip,
    ua: ctx.ua,
    status: 0,
    release: String(data.release || '').slice(0, 128),
    sourceMapApplied: false,
  };
}
