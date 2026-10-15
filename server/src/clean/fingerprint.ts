import { createHash } from 'crypto';
import type { StackFrame } from '../db/types';

export function normalizeMessage(message: string): string {
  return String(message || '')
    .replace(/\b[\w-]{36}\b/g, '{uuid}')
    .replace(/\b\d{13,17}\b/g, '{ts}')
    .replace(/\b\d{5,}\b/g, '{num}')
    .replace(/[?#&].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprintError(data: { type?: string; name?: string; message?: string }, stack: StackFrame[]): string {
  const type = String(data.type || 'UNKNOWN');
  const name = String(data.name || 'UNKNOWN');
  const message = normalizeMessage(String(data.message || ''));
  const frames = (stack || [])
    .slice(0, 6)
    .map((f) => `${f.url || ''}:${f.line ?? 0}:${f.column ?? 0}:${f.func || ''}`)
    .join('|');
  const raw = `${type}|${name}|${message}|${frames}`;
  return createHash('sha1').update(raw).digest('hex').slice(0, 24);
}
